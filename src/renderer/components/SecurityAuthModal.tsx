/**
 * SecurityAuthModal Component - Desktop Security Authentication
 * 데스크탑용 보안 메모 인증 모달
 */

import React, { useState, useEffect } from 'react';
import { uiLogger } from '../../shared/utils/logger';
import { api } from '../../shared/services/apiService';
import './SecurityAuthModal.css';

interface SecurityAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  memoTitle?: string;
}

const SecurityAuthModal: React.FC<SecurityAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  memoTitle = '보안 메모'
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 모달이 열릴 때마다 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setIsAuthenticating(false);
    }
  }, [isOpen]);

  // 인증 처리
  const handleAuth = async () => {
    if (!password.trim()) {
      setError('보안 비밀번호를 입력해주세요.');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    try {
      uiLogger.debug('🔒 보안 메모 인증 시도...');
      
      const result = await api.user.authenticateSecurityPassword(password);
      
      if (result.success) {
        uiLogger.debug('✅ 보안 인증 성공');
        onAuthenticated();
        onClose();
      } else {
        setError(result.message || '보안 비밀번호가 올바르지 않습니다.');
      }
    } catch (error: any) {
      uiLogger.error('❌ 보안 인증 실패:', error);
      
      if (error.response?.status === 401) {
        setError('보안 비밀번호가 올바르지 않습니다.');
      } else if (error.response?.status === 404) {
        setError('보안 설정이 되어있지 않습니다. 설정 메뉴에서 보안 비밀번호를 설정해주세요.');
      } else {
        setError('보안 인증에 실패했습니다. 네트워크 연결을 확인해주세요.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAuthenticating) {
      handleAuth();
    }
  };

  // ESC 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // 모달 외부 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="security-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="security-modal-container">
        {/* 모달 헤더 */}
        <div className="security-modal-header">
          <div className="security-modal-icon">🔒</div>
          <h3 className="security-modal-title">보안 메모 인증</h3>
          <button
            className="security-modal-close"
            onClick={onClose}
            title="닫기"
          >
            ✕
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="security-modal-content">
          <div className="security-memo-info">
            <p className="security-memo-title">
              "{memoTitle}"
            </p>
            <p className="security-description">
              이 메모는 보안 메모입니다. 보안 비밀번호를 입력해주세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="security-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          {/* 비밀번호 입력 */}
          <div className="security-input-group">
            <label htmlFor="security-password" className="security-label">
              보안 비밀번호
            </label>
            <input
              id="security-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="보안 비밀번호를 입력하세요"
              className="security-input"
              autoFocus
              disabled={isAuthenticating}
            />
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="security-modal-footer">
          <button
            className="security-btn security-btn-cancel"
            onClick={onClose}
            disabled={isAuthenticating}
          >
            취소
          </button>
          <button
            className="security-btn security-btn-auth"
            onClick={handleAuth}
            disabled={isAuthenticating || !password.trim()}
          >
            {isAuthenticating ? (
              <>
                <span className="auth-spinner"></span>
                인증 중...
              </>
            ) : (
              '인증'
            )}
          </button>
        </div>

        {/* 도움말 */}
        <div className="security-help">
          <small>
            💡 보안 비밀번호를 잊으셨나요? 설정 메뉴에서 재설정할 수 있습니다.
          </small>
        </div>
      </div>
    </div>
  );
};

export default SecurityAuthModal;