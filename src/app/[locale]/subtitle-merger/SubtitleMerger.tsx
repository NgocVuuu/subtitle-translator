"use client";

import React, { useState } from 'react';
import { Card, Upload, Button, InputNumber, Select, Typography, Space, message, Divider } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import { mergeSubtitles } from './mergerUtils';
import { useTranslations } from "next-intl";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

export default function SubtitleMerger() {
    const t = useTranslations("SubtitleMerger");

    const [fileList1, setFileList1] = useState<{file: File, content: string}[]>([]);
    const [offset1, setOffset1] = useState<number>(0);

    const [fileList2, setFileList2] = useState<{file: File, content: string}[]>([]);
    const [offset2, setOffset2] = useState<number>(0);

    const [format, setFormat] = useState<"srt" | "vtt" | "ass">("ass");

    const handleUpload = (file: File, isPrimary: boolean) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (isPrimary) {
                setFileList1(prev => [...prev, { file, content }]);
            } else {
                setFileList2(prev => [...prev, { file, content }]);
            }
        };
        reader.readAsText(file);
        return false; // Prevent automatic upload
    };

    const handleMerge = () => {
        if (fileList1.length === 0 || fileList2.length === 0) {
            message.error(t("errorMissingFiles"));
            return;
        }

        if (fileList1.length !== fileList2.length) {
            message.error(t("errorCountMismatch"));
            return;
        }

        // Sort files alphabetically to match them up
        const sorted1 = [...fileList1].sort((a, b) => a.file.name.localeCompare(b.file.name));
        const sorted2 = [...fileList2].sort((a, b) => a.file.name.localeCompare(b.file.name));

        try {
            // Convert seconds to ms
            const primaryOffsetMs = offset1 * 1000;
            const secondaryOffsetMs = offset2 * 1000;

            for (let i = 0; i < sorted1.length; i++) {
                const f1 = sorted1[i];
                const f2 = sorted2[i];

                const mergedText = mergeSubtitles(
                    f1.content,
                    f2.content,
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
                const originalName = f1.file.name;
                const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
                a.download = `${baseName}_merged.${ext}`;
                a.click();
                URL.revokeObjectURL(url);
            }
            
            message.success(t("successMerge"));
        } catch (error) {
            console.error(error);
            message.error(t("errorMerge"));
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Title level={2}>{t("title")}</Title>
            <Paragraph>
                {t("description")}
            </Paragraph>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card title={t("primaryCard")}>
                    <Dragger
                        accept=".srt,.vtt,.ass"
                        beforeUpload={(f) => handleUpload(f, true)}
                        showUploadList={false}
                        multiple={true}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">{t("uploadHint")}</p>
                    </Dragger>
                    {fileList1.length > 0 && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <Text strong>{t("fileCount", { count: fileList1.length })}</Text>
                                <Button size="small" danger onClick={() => setFileList1([])}>{t("clearBtn")}</Button>
                            </div>
                            <div className="max-h-32 overflow-y-auto border border-gray-700 rounded p-2 text-sm bg-[#1a1a1a]">
                                {fileList1.map((item, idx) => (
                                    <p key={idx} className="text-blue-400 break-all whitespace-normal border-b border-gray-800 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                                        {item.file.name}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                        <Text>{t("timeOffset")}</Text>
                        <InputNumber 
                            value={offset1} 
                            onChange={(val) => setOffset1(val || 0)} 
                            step={0.1}
                        />
                    </div>
                </Card>

                <Card title={t("secondaryCard")}>
                    <Dragger
                        accept=".srt,.vtt,.ass"
                        beforeUpload={(f) => handleUpload(f, false)}
                        showUploadList={false}
                        multiple={true}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">{t("uploadHint")}</p>
                    </Dragger>
                    {fileList2.length > 0 && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <Text strong>{t("fileCount", { count: fileList2.length })}</Text>
                                <Button size="small" danger onClick={() => setFileList2([])}>{t("clearBtn")}</Button>
                            </div>
                            <div className="max-h-32 overflow-y-auto border border-gray-700 rounded p-2 text-sm bg-[#1a1a1a]">
                                {fileList2.map((item, idx) => (
                                    <p key={idx} className="text-blue-400 break-all whitespace-normal border-b border-gray-800 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                                        {item.file.name}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                        <Text>{t("timeOffset")}</Text>
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
                <Space size="large" className="flex-wrap justify-center">
                    <div>
                        <Text strong className="mr-2">{t("outputFormat")}</Text>
                        <Select value={format} onChange={(val) => setFormat(val)} style={{ minWidth: 160 }}>
                            <Option value="ass">{t("formatAss")}</Option>
                            <Option value="srt">{t("formatSrt")}</Option>
                            <Option value="vtt">{t("formatVtt")}</Option>
                        </Select>
                    </div>
                    <Button 
                        type="primary" 
                        icon={<DownloadOutlined />} 
                        size="large"
                        onClick={handleMerge}
                        disabled={fileList1.length === 0 || fileList2.length === 0}
                    >
                        {t("mergeBtn")}
                    </Button>
                </Space>
            </div>
        </div>
    );
}
