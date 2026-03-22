'use client';

import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'fleetease-onboarding-completed';

export function useOnboarding() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    setIsOnboardingComplete(completed === 'true');
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOnboardingComplete(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setIsOnboardingComplete(false);
  };

  return {
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  };
}
