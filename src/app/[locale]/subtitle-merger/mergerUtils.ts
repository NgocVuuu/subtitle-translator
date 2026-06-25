export interface SubBlock {
    id: number;
    start: number;
    end: number;
    text: string;
}

export function timeToMs(timeStr: string): number {
    const match = timeStr.trim().match(/^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{1,3})$/);
    if (!match) return 0;
    const [, h, m, s, ms] = match;
    const hours = parseInt(h || "0", 10);
    const minutes = parseInt(m, 10);
    const seconds = parseInt(s, 10);
    const milliseconds = parseInt(ms.padEnd(3, "0"), 10);
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

export function msToTime(ms: number, format: "srt" | "vtt" | "ass" = "srt"): string {
    const totalMs = Math.max(0, ms); // prevent negative
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;

    const hStr = String(hours).padStart(2, "0");
    const mStr = String(minutes).padStart(2, "0");
    const sStr = String(seconds).padStart(2, "0");
    const msStr = String(milliseconds).padStart(3, "0");
    const csStr = String(Math.floor(milliseconds / 10)).padStart(2, "0");

    if (format === "ass") {
        return `${hours}:${mStr}:${sStr}.${csStr}`;
    }
    const sep = format === "srt" ? "," : ".";
    return `${hStr}:${mStr}:${sStr}${sep}${msStr}`;
}

export function parseSubtitleBlocks(content: string): SubBlock[] {
    const blocks: SubBlock[] = [];
    const text = content.replace(/\r\n/g, "\n");
    const rawBlocks = text.split(/\n\s*\n/);
    
    let idCounter = 1;
    for (const raw of rawBlocks) {
        const lines = raw.trim().split("\n");
        if (lines.length === 0 || lines[0] === "") continue;
        
        let timeLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("-->")) {
                timeLineIndex = i;
                break;
            }
        }
        
        if (timeLineIndex === -1) continue;
        
        const timeParts = lines[timeLineIndex].split("-->");
        if (timeParts.length < 2) continue;
        
        const start = timeToMs(timeParts[0]);
        const end = timeToMs(timeParts[1]);
        
        let textLines = lines.slice(timeLineIndex + 1);
        textLines = textLines.map(line => line.replace(/<\/?c[^>]*>/gi, "").replace(/<\d{1,2}:\d{2}[^>]*>/g, ""));
        const textContent = textLines.join("\n").trim();
        
        if (textContent) {
            blocks.push({
                id: idCounter++,
                start,
                end,
                text: textContent
            });
        }
    }
    return blocks;
}

const ASS_HEADER = `[Script Info]
Title: Bilingual Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: Yes
PlayResX: 1920
PlayResY: 1080
Collisions: Normal

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans,70,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,30,30,35,1
Style: Secondary,Noto Sans,55,&H003CF7F4,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,30,30,35,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

export function mergeSubtitles(
    primaryContent: string, 
    secondaryContent: string, 
    primaryOffsetMs: number, 
    secondaryOffsetMs: number,
    primaryStretchMs: number,
    secondaryStretchMs: number,
    format: "srt" | "vtt" | "ass",
    thresholdMs: number = 1500
): string {
    const primaryBlocks = parseSubtitleBlocks(primaryContent);
    const secondaryBlocks = parseSubtitleBlocks(secondaryContent);
    
    const pLast = primaryBlocks.length > 0 ? primaryBlocks[primaryBlocks.length - 1].end : 1;
    const sLast = secondaryBlocks.length > 0 ? secondaryBlocks[secondaryBlocks.length - 1].end : 1;
    
    const pFactor = pLast > 0 ? (pLast + primaryStretchMs) / pLast : 1;
    const sFactor = sLast > 0 ? (sLast + secondaryStretchMs) / sLast : 1;

    primaryBlocks.forEach(b => {
        b.start = b.start * pFactor + primaryOffsetMs;
        b.end = b.end * pFactor + primaryOffsetMs;
    });
    secondaryBlocks.forEach(b => {
        b.start = b.start * sFactor + secondaryOffsetMs;
        b.end = b.end * sFactor + secondaryOffsetMs;
    });
    
    const mergedBlocks: { start: number, end: number, primaryText: string, secondaryText: string }[] = [];
    
    let secIndex = 0;
    
    for (const pBlock of primaryBlocks) {
        let bestMatch: SubBlock | null = null;
        let bestDiff = Infinity;
        
        const startSearch = Math.max(0, secIndex - 20);
        const endSearch = Math.min(secondaryBlocks.length, secIndex + 50);
        
        for (let i = startSearch; i < endSearch; i++) {
            const sBlock = secondaryBlocks[i];
            const diff = Math.abs(pBlock.start - sBlock.start);
            if (diff <= thresholdMs && diff < bestDiff) {
                bestDiff = diff;
                bestMatch = sBlock;
                secIndex = i;
            }
        }
        
        if (bestMatch) {
            mergedBlocks.push({
                start: pBlock.start,
                end: Math.max(pBlock.end, bestMatch.end),
                primaryText: pBlock.text,
                secondaryText: bestMatch.text
            });
        }
    }
    
    if (format === "ass") {
        let output = ASS_HEADER + "\n";
        for (const b of mergedBlocks) {
            const start = msToTime(b.start, "ass");
            const end = msToTime(b.end, "ass");
            const pText = b.primaryText.replace(/\n/g, "\\N");
            const sText = b.secondaryText.replace(/\n/g, "\\N");
            
            output += `Dialogue: 0,${start},${end},Secondary,NTP,0000,0000,0000,,${sText}\n`;
            output += `Dialogue: 0,${start},${end},Default,NTP,0000,0000,0000,,${pText}\n`;
        }
        return output;
    } else {
        let output = format === "vtt" ? "WEBVTT\n\n" : "";
        let counter = 1;
        for (const b of mergedBlocks) {
            const start = msToTime(b.start, format);
            const end = msToTime(b.end, format);
            
            if (format === "srt") {
                output += `${counter}\n`;
            }
            output += `${start} --> ${end}\n`;
            output += `${b.secondaryText}\n${b.primaryText}\n\n`;
            counter++;
        }
        return output.trim() + "\n";
    }
}

export function adjustSingleSubtitle(
    content: string,
    offsetMs: number,
    stretchMs: number,
    format: "srt" | "vtt" | "ass"
): string {
    const blocks = parseSubtitleBlocks(content);
    const lastEnd = blocks.length > 0 ? blocks[blocks.length - 1].end : 1;
    const factor = lastEnd > 0 ? (lastEnd + stretchMs) / lastEnd : 1;

    blocks.forEach(b => {
        b.start = b.start * factor + offsetMs;
        b.end = b.end * factor + offsetMs;
    });

    if (format === "ass") {
        let output = ASS_HEADER + "\n";
        for (const b of blocks) {
            const start = msToTime(b.start, "ass");
            const end = msToTime(b.end, "ass");
            const text = b.text.replace(/\n/g, "\\N");
            output += `Dialogue: 0,${start},${end},Default,NTP,0000,0000,0000,,${text}\n`;
        }
        return output;
    } else {
        let output = format === "vtt" ? "WEBVTT\n\n" : "";
        let counter = 1;
        for (const b of blocks) {
            const start = msToTime(b.start, format);
            const end = msToTime(b.end, format);
            if (format === "srt") {
                output += `${counter}\n`;
            }
            output += `${start} --> ${end}\n`;
            output += `${b.text}\n\n`;
            counter++;
        }
        return output.trim() + "\n";
    }
}
