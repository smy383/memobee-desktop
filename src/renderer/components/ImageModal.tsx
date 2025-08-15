/**
 * ImageModal Component - 이미지 확대 보기 모달
 * 메모의 이미지를 클릭했을 때 전체화면으로 표시
 */

import React, { useState, useEffect } from 'react';
import './ImageModal.css';
import { FaSearchMinus, FaSearchPlus, FaExpand, FaTimes, FaLightbulb } from 'react-icons/fa';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName?: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  imageUrl,
  imageName = 'image',
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // 확대/축소 핸들러
  const handleZoom = (delta: number, clientX?: number, clientY?: number) => {
    const newScale = Math.max(0.1, Math.min(5, scale + delta));
    
    if (clientX !== undefined && clientY !== undefined) {
      // 마우스 위치를 기준으로 확대/축소
      const rect = document.querySelector('.image-modal-content')?.getBoundingClientRect();
      if (rect) {
        const offsetX = clientX - rect.left - rect.width / 2;
        const offsetY = clientY - rect.top - rect.height / 2;
        
        setPosition({
          x: position.x - offsetX * (newScale - scale) / scale,
          y: position.y - offsetY * (newScale - scale) / scale
        });
      }
    }
    
    setScale(newScale);
  };

  // 휠로 확대/축소
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta, e.clientX, e.clientY);
  };

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 이미지 리셋
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 이미지 로드 완료
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-container">
        {/* 상단 툴바 */}
        <div className="image-modal-toolbar">
          <div className="image-modal-info">
            <span className="image-name">{imageName}</span>
            <span className="image-scale">{Math.round(scale * 100)}%</span>
          </div>
          <div className="image-modal-controls">
            <button
              className="control-btn zoom-out-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleZoom(-0.2);
              }}
              title="축소 (마우스 휠)"
            >
              <FaSearchMinus />
            </button>
            <button
              className="control-btn zoom-in-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleZoom(0.2);
              }}
              title="확대 (마우스 휠)"
            >
              <FaSearchPlus />
            </button>
            <button
              className="control-btn reset-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              title="원본 크기"
            >
              <FaExpand />
              <span className="btn-text">원본</span>
            </button>
            <button
              className="control-btn close-btn"
              onClick={onClose}
              title="닫기 (ESC)"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* 이미지 컨테이너 */}
        <div 
          className="image-modal-content"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => e.stopPropagation()}
          style={{
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        >
          {isLoading && (
            <div className="image-loading">
              <div className="loading-spinner"></div>
              <span>이미지 로딩 중...</span>
            </div>
          )}
          
          <img
            src={imageUrl}
            alt={imageName}
            onLoad={handleImageLoad}
            onError={() => setIsLoading(false)}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: scale === 1 ? '90vw' : 'none',
              maxHeight: scale === 1 ? '80vh' : 'none',
              objectFit: 'contain'
            }}
            draggable={false}
          />
        </div>

        {/* 하단 도움말 */}
        <div className="image-modal-help">
          <span><FaLightbulb /> 마우스 휠로 확대/축소 | 드래그로 이동 | ESC로 닫기</span>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;