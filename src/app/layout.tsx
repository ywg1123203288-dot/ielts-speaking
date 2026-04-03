import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'IELTS 口语素材库',
    template: '%s | IELTS Study',
  },
  description:
    '雅思口语学习工具，帮助您收集和管理雅思口语语料库，通过音频转文字、句子跳转播放等功能提升学习效率',
  keywords: [
    '雅思',
    'IELTS',
    '口语',
    '学习',
    '素材库',
    '语料库',
    '音频转文字',
    '翻译',
  ],
  authors: [{ name: 'IELTS Study Team' }],
  openGraph: {
    title: 'IELTS 口语素材库',
    description:
      '专业的雅思口语学习工具，助力您的雅思备考之旅',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
