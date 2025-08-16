/**
 * ProUpgradeModal Component - Desktop Pro Upgrade Modal
 * 데스크탑용 Pro 업그레이드 모달
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaCrown, FaCheck, FaGlobe } from 'react-icons/fa';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  const { t } = useTranslation(['common', 'subscription']);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUpgradeClick = () => {
    // 데스크탑에서는 웹버전 구독 페이지로 안내
    onUpgrade();
  };

  return (
    <div className="pro-upgrade-modal-overlay" onClick={handleOverlayClick}>
      <div className="pro-upgrade-modal">
        <div className="pro-upgrade-modal-header">
          <div className="modal-title-section">
            <FaCrown className="crown-icon" />
            <h2>MemoBee Pro로 업그레이드</h2>
          </div>
          <button className="pro-upgrade-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="pro-upgrade-modal-content">
          <div className="upgrade-message">
            <p className="main-message">
              <strong>데스크탑에서 메모를 편집하려면 Pro 구독이 필요합니다</strong>
            </p>
            <p className="sub-message">
              현재는 메모를 읽기만 가능합니다. 모든 기능을 이용하려면 Pro로 업그레이드하세요.
            </p>
          </div>
          
          <div className="pro-features-list">
            <h3>Pro 구독 혜택</h3>
            <div className="feature-grid">
              <div className="pro-feature">
                <FaCheck className="feature-icon" />
                <span>무제한 메모 생성 및 편집</span>
              </div>
              <div className="pro-feature">
                <FaCheck className="feature-icon" />
                <span>모든 플랫폼에서 동기화</span>
              </div>
              <div className="pro-feature">
                <FaCheck className="feature-icon" />
                <span>AI 분석 및 질문 기능</span>
              </div>
              <div className="pro-feature">
                <FaCheck className="feature-icon" />
                <span>파일 첨부 및 공유</span>
              </div>
              <div className="pro-feature">
                <FaCheck className="feature-icon" />
                <span>모바일 앱 광고 제거</span>
              </div>
              <div className="pro-feature">
                <FaCheck className="feature-icon" />
                <span>우선 고객 지원</span>
              </div>
            </div>
          </div>
          
          <div className="upgrade-notice">
            <div className="web-upgrade-info">
              <FaGlobe className="web-icon" />
              <div className="web-text">
                <p><strong>구독은 웹 사이트에서 가능합니다</strong></p>
                <p>MemoBee 웹사이트에서 Pro 구독 후 모든 기기에서 이용하세요</p>
              </div>
            </div>
          </div>
          
          <div className="pro-upgrade-actions">
            <button 
              className="pro-upgrade-button"
              onClick={handleUpgradeClick}
            >
              웹사이트에서 구독하기
            </button>
            <button 
              className="pro-upgrade-cancel"
              onClick={onClose}
            >
              나중에
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .pro-upgrade-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }

        .pro-upgrade-modal {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 520px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .pro-upgrade-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 0;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .modal-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .crown-icon {
          color: #fbbf24;
          font-size: 24px;
        }

        .pro-upgrade-modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .pro-upgrade-modal-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 8px;
          color: #6b7280;
          transition: all 0.2s ease;
        }

        .pro-upgrade-modal-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .pro-upgrade-modal-content {
          padding: 0 24px 24px;
        }

        .upgrade-message {
          text-align: center;
          margin-bottom: 32px;
        }

        .main-message {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .sub-message {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .pro-features-list h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
          text-align: center;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 32px;
        }

        .pro-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .feature-icon {
          color: #10b981;
          font-size: 16px;
          flex-shrink: 0;
        }

        .pro-feature span {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }

        .upgrade-notice {
          margin-bottom: 24px;
        }

        .web-upgrade-info {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 8px;
        }

        .web-icon {
          color: #3b82f6;
          font-size: 20px;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .web-text p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        }

        .web-text p:first-child {
          color: #1e40af;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .web-text p:last-child {
          color: #3730a3;
        }

        .pro-upgrade-actions {
          display: flex;
          gap: 12px;
          flex-direction: column;
        }

        .pro-upgrade-button {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .pro-upgrade-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .pro-upgrade-cancel {
          background: transparent;
          color: #6b7280;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pro-upgrade-cancel:hover {
          background: #f9fafb;
          color: #374151;
          border-color: #9ca3af;
        }

        /* 다크모드 대응 */
        @media (prefers-color-scheme: dark) {
          .pro-upgrade-modal {
            background: #1f2937;
            color: #f9fafb;
          }

          .pro-upgrade-modal-header {
            border-bottom-color: #374151;
          }

          .pro-upgrade-modal-header h2 {
            color: #f9fafb;
          }

          .main-message {
            color: #f9fafb;
          }

          .sub-message {
            color: #9ca3af;
          }

          .pro-features-list h3 {
            color: #f9fafb;
          }

          .pro-feature {
            background: #374151;
            border-color: #4b5563;
          }

          .pro-feature span {
            color: #e5e7eb;
          }

          .web-upgrade-info {
            background: #1e3a8a;
            border-color: #1e40af;
          }

          .pro-upgrade-cancel {
            color: #9ca3af;
            border-color: #4b5563;
          }

          .pro-upgrade-cancel:hover {
            background: #374151;
            color: #e5e7eb;
            border-color: #6b7280;
          }
        }
      `}</style>
    </div>
  );
};

export default ProUpgradeModal;