"use client";

import React, { useState } from 'react';
import { Card, Upload, Button, InputNumber, Select, Typography, Space, message, Divider } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import { mergeSubtitles } from './mergerUtils';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

export default function SubtitleMerger() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file1Content, setFile1Content] = useState<string>("");
    const [offset1, setOffset1] = useState<number>(0);

    const [file2, setFile2] = useState<File | null>(null);
    const [file2Content, setFile2Content] = useState<string>("");
    const [offset2, setOffset2] = useState<number>(0);

    const [format, setFormat] = useState<"srt" | "vtt" | "ass">("ass");

    const handleUpload = (file: File, isPrimary: boolean) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (isPrimary) {
                setFile1(file);
                setFile1Content(content);
            } else {
                setFile2(file);
                setFile2Content(content);
            }
        };
        reader.readAsText(file);
        return false; // Prevent automatic upload
    };

    const handleMerge = () => {
        if (!file1Content || !file2Content) {
            message.error("Vui lòng tải lên cả 2 file phụ đề.");
            return;
        }

        try {
            // Convert seconds to ms
            const primaryOffsetMs = offset1 * 1000;
            const secondaryOffsetMs = offset2 * 1000;

            const mergedText = mergeSubtitles(
                file1Content,
                file2Content,
                primaryOffsetMs,
                secondaryOffsetMs,
                format
            );

            // Trigger download
            const blob = new Blob([mergedText], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const ext = format;
            a.download = `merged_bilingual.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
            
            message.success("Gộp phụ đề thành công!");
        } catch (error) {
            console.error(error);
            message.error("Có lỗi xảy ra khi gộp phụ đề.");
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Title level={2}>Gộp Phụ Đề Song Ngữ</Title>
            <Paragraph>
                Công cụ giúp ghép 2 file phụ đề (ví dụ: Tiếng Anh và Tiếng Việt) thành 1 file phụ đề duy nhất. 
                Hệ thống tự động lọc các dòng rác và đồng bộ theo thời gian.
            </Paragraph>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card title="Phụ đề gốc (Primary) - Hiển thị ở dưới">
                    <Dragger
                        accept=".srt,.vtt,.ass"
                        beforeUpload={(f) => handleUpload(f, true)}
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Nhấp hoặc kéo thả file vào đây</p>
                        {file1 && <p className="text-blue-500 mt-2 font-bold">{file1.name}</p>}
                    </Dragger>
                    <div className="mt-4 flex items-center justify-between">
                        <Text>Dịch chuyển thời gian (giây):</Text>
                        <InputNumber 
                            value={offset1} 
                            onChange={(val) => setOffset1(val || 0)} 
                            step={0.1}
                        />
                    </div>
                </Card>

                <Card title="Phụ đề dịch (Secondary) - Hiển thị ở trên">
                    <Dragger
                        accept=".srt,.vtt,.ass"
                        beforeUpload={(f) => handleUpload(f, false)}
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Nhấp hoặc kéo thả file vào đây</p>
                        {file2 && <p className="text-blue-500 mt-2 font-bold">{file2.name}</p>}
                    </Dragger>
                    <div className="mt-4 flex items-center justify-between">
                        <Text>Dịch chuyển thời gian (giây):</Text>
                        <InputNumber 
                            value={offset2} 
                            onChange={(val) => setOffset2(val || 0)} 
                            step={0.1}
                        />
                    </div>
                </Card>
            </div>

            <Divider />

            <div className="flex flex-col items-center gap-4">
                <Space size="large">
                    <div>
                        <Text strong className="mr-2">Định dạng xuất ra:</Text>
                        <Select value={format} onChange={(val) => setFormat(val)} style={{ width: 120 }}>
                            <Option value="ass">ASS (Đẹp nhất)</Option>
                            <Option value="srt">SRT (Phổ biến)</Option>
                            <Option value="vtt">VTT (Cho Web)</Option>
                        </Select>
                    </div>
                    <Button 
                        type="primary" 
                        icon={<DownloadOutlined />} 
                        size="large"
                        onClick={handleMerge}
                        disabled={!file1 || !file2}
                    >
                        Gộp & Tải xuống
                    </Button>
                </Space>
            </div>
        </div>
    );
}
