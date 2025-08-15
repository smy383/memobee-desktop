import React, { useState, useEffect } from 'react';
import './UpdateNotification.css';

interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

const UpdateNotification: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);

  useEffect(() => {
    // Electron IPC 리스너 등록
    const handleUpdateDownloadStarted = () => {
      setIsDownloading(true);
      setProgress(null);
    };

    const handleUpdateDownloadProgress = (event: any, progressData: UpdateProgress) => {
      setProgress(progressData);
    };

    // IPC 리스너 추가
    if (window.electronAPI) {
      window.electronAPI.on('update-download-started', handleUpdateDownloadStarted);
      window.electronAPI.on('update-download-progress', handleUpdateDownloadProgress);
    }

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('update-download-started', handleUpdateDownloadStarted);
        window.electronAPI.removeListener('update-download-progress', handleUpdateDownloadProgress);
      }
    };
  }, []);

  if (!isDownloading) {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="update-notification">
      <div className="update-content">
        <div className="update-icon">
          <div className="spinner"></div>
        </div>
        <div className="update-text">
          <h4>업데이트 다운로드 중</h4>
          {progress && (
            <div className="update-details">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress.percent}%` }}
                ></div>
              </div>
              <div className="progress-info">
                <span>{progress.percent.toFixed(1)}%</span>
                <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
              </div>
            </div>
          )}
          <p>다운로드가 완료되면 재시작 안내를 표시합니다.</p>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;