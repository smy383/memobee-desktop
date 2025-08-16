/**
 * useSubscription Hook - Desktop Subscription Management
 * 데스크탑용 구독 상태 관리 훅
 */

import { useState, useEffect } from 'react';
import { api } from '../../shared/services/apiService';
import { authService } from '../../shared/services/authService';

interface SubscriptionData {
  is_pro: boolean;
  subscription_status?: string;
  subscription_type?: string;
  subscription_end_date?: string;
  subscription_plan?: string;
  subscription_price?: string;
}

interface UseSubscriptionReturn {
  subscriptionData: SubscriptionData | null;
  isLoading: boolean;
  error: string | null;
  isPro: boolean;
  refreshSubscriptionStatus: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  console.log('🚀 useSubscription 훅이 호출되었습니다!');
  
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🎯 useSubscription 훅 실행됨 - 상태 초기화 완료!');

  const loadSubscriptionStatus = async () => {
    try {
      console.log('🚀 loadSubscriptionStatus 함수 시작!');
      setIsLoading(true);
      setError(null);
      
      // 사용자 프로필에서 구독 정보 가져오기
      console.log('📡 API 호출 시작: api.user.getProfile()');
      const profile = await api.user.getProfile();
      console.log('🔍 사용자 프로필 원본:', profile);
      
      // 구독 데이터 변환
      const subscriptionInfo: SubscriptionData = {
        is_pro: profile.subscription_status === 'pro',
        subscription_status: profile.subscription_status,
        subscription_type: profile.subscription_type,
        subscription_end_date: profile.current_period_end,
        subscription_plan: profile.subscription_type === 'yearly' ? 'Pro Annual' : 'Pro Monthly',
        subscription_price: profile.subscription_type === 'yearly' ? '$40.80/year' : '$4.00/month'
      };
      
      console.log('🎯 구독 정보 변환 완료:', subscriptionInfo);
      console.log('💰 is_pro 결과:', subscriptionInfo.is_pro);
      
      setSubscriptionData(subscriptionInfo);
      console.log('✅ 구독 상태 로드 성공:', subscriptionInfo);
      console.log('🎯 isPro 계산 결과:', subscriptionInfo.is_pro);
    } catch (err) {
      console.error('❌ 구독 상태 로드 실패:', err);
      setError('구독 상태를 불러올 수 없습니다.');
      
      // 에러 시 기본값 설정 (Free 사용자로 처리)
      const fallbackData = {
        is_pro: false,
        subscription_status: 'free'
      };
      console.log('🔄 에러 시 기본값 설정:', fallbackData);
      setSubscriptionData(fallbackData);
    } finally {
      setIsLoading(false);
      console.log('✅ loadSubscriptionStatus 완료');
    }
  };

  const refreshSubscriptionStatus = async () => {
    await loadSubscriptionStatus();
  };

  useEffect(() => {
    console.log('⚡ useEffect 실행 - loadSubscriptionStatus 호출');
    
    // 현재 사용자가 있는지 확인
    const currentUser = authService.getCurrentUser();
    console.log('👤 현재 로그인된 사용자:', currentUser ? 'logged in' : 'not logged in');
    
    if (currentUser) {
      console.log('✅ 사용자 로그인 상태 확인됨 - 구독 정보 로드 시작');
      loadSubscriptionStatus();
    } else {
      console.log('❌ 사용자가 로그인되지 않음 - 구독 정보 로드 중단');
      setIsLoading(false);
      setSubscriptionData({
        is_pro: false,
        subscription_status: 'free'
      });
    }
  }, []);

  // isPro 계산 - 안전한 기본값 제공
  const isPro = subscriptionData?.is_pro || false;
  console.log('🔢 현재 isPro 값:', isPro, '/ subscriptionData:', subscriptionData);

  const result = {
    subscriptionData,
    isLoading,
    error,
    isPro,
    refreshSubscriptionStatus
  };
  
  console.log('📤 useSubscription return 값:', result);

  return result;
};