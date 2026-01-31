"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Dashboard from "../page-dashboard"
import { useKakaoLogin } from "./kakao-login"
import { UserSignup } from "./user-signup"

// 앱의 상태를 정의
type AppState = 'loading' | 'login' | 'signup' | 'dashboard'

// localStorage 키
const SESSION_KEY = 'fc_bro_user'

export function AppWrapper() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [isLoading, setIsLoading] = useState(false)
  const [kakaoUserInfo, setKakaoUserInfo] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [error, setError] = useState("")

  // Animation states
  const [isSplashVisible, setIsSplashVisible] = useState(true)
  const [isExitingSplash, setIsExitingSplash] = useState(false)

  // 세션 저장 함수
  const saveSession = useCallback((userData: any) => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
      console.log('세션 저장 완료')
    } catch (e) {
      console.error('세션 저장 오류:', e)
    }
  }, [])

  // 세션 삭제 함수 (로그아웃)
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY)
      console.log('세션 삭제 완료')
    } catch (e) {
      console.error('세션 삭제 오류:', e)
    }
  }, [])

  // Handle splash exit animation when entering dashboard
  useEffect(() => {
    if (appState === 'dashboard') {
      setIsExitingSplash(true)
      const timer = setTimeout(() => {
        setIsSplashVisible(false)
      }, 1000) // 1s animation to match transition duration
      return () => clearTimeout(timer)
    }
  }, [appState])

  // 저장된 세션 확인 및 검증
  useEffect(() => {
    const checkSavedSession = async () => {
      try {
        const savedUser = localStorage.getItem(SESSION_KEY)

        if (savedUser) {
          const userData = JSON.parse(savedUser)
          console.log('저장된 세션 발견:', userData.kakaoId)

          // 서버에서 사용자 유효성 검증
          const response = await fetch('/api/user/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kakaoId: userData.kakaoId })
          })

          const result = await response.json()

          if (response.ok && result.exists) {
            // 유효한 세션 - 대시보드로 이동
            console.log('세션 검증 성공')
            setUserInfo(result.user)
            saveSession(result.user) // 최신 정보로 갱신
            setAppState('dashboard')
          } else {
            // 유효하지 않은 세션 - 로그인 화면
            console.log('세션이 유효하지 않음, 로그인 필요')
            clearSession()
            setAppState('login')
          }
        } else {
          // 저장된 세션 없음
          setAppState('login')
        }
      } catch (e) {
        console.error('세션 확인 오류:', e)
        clearSession()
        setAppState('login')
      }
    }

    checkSavedSession()
  }, [saveSession, clearSession])

  // 기존 사용자 확인 함수
  const checkExistingUser = useCallback(async (kakaoUserInfo: any) => {
    try {
      console.log('사용자 존재 여부 확인 중...')

      const response = await fetch('/api/user/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kakaoId: kakaoUserInfo.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '사용자 확인 중 오류가 발생했습니다.')
      }

      if (result.exists) {
        // 기존 사용자 - 세션 저장 후 대시보드로 이동
        console.log('기존 사용자 로그인:', result.user)
        saveSession(result.user)
        setUserInfo(result.user)
        setAppState('dashboard')
        setIsLoading(false)
      } else {
        // 신규 사용자 - 회원가입 화면으로 이동
        console.log('신규 사용자 - 회원가입 진행')
        setAppState('signup')
        setIsLoading(false)
      }

    } catch (error) {
      console.error('사용자 확인 오류:', error)
      setError('사용자 정보 확인 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }, [saveSession])

  // 콜백 페이지에서 저장한 카카오 로그인 정보 처리
  useEffect(() => {
    const pendingLogin = sessionStorage.getItem('kakao_login_pending')
    const savedUserInfo = sessionStorage.getItem('kakao_user_info')

    if (pendingLogin === 'true' && savedUserInfo) {
      sessionStorage.removeItem('kakao_login_pending')
      sessionStorage.removeItem('kakao_user_info')

      try {
        const kakaoUser = JSON.parse(savedUserInfo)
        console.log('콜백에서 받은 카카오 사용자 정보:', kakaoUser)
        setKakaoUserInfo(kakaoUser)
        setIsLoading(true)
        checkExistingUser(kakaoUser)
      } catch (e) {
        console.error('카카오 사용자 정보 파싱 오류:', e)
      }
    }
  }, [checkExistingUser])

  const { loginWithKakao, isKakaoReady, isLoading: kakaoLoading } = useKakaoLogin({
    onSuccess: async (kakaoUserInfo) => {
      console.log('카카오 로그인 성공:', kakaoUserInfo)
      setKakaoUserInfo(kakaoUserInfo)

      try {
        // 기존 사용자인지 확인
        await checkExistingUser(kakaoUserInfo)
      } catch (error) {
        console.error('사용자 확인 중 오류:', error)
        setError('사용자 정보 확인 중 오류가 발생했습니다.')
        setIsLoading(false)
      }
    },
    onError: (errorMessage) => {
      console.error('로그인 오류:', errorMessage)
      setError(errorMessage)
      setIsLoading(false)
    }
  })

  const handleKakaoLogin = () => {
    if (!isKakaoReady) {
      setError("카카오 SDK가 아직 준비되지 않았습니다. 잠시만 기다려주세요.")
      return
    }

    setIsLoading(true)
    setError("")
    loginWithKakao()
  }



  const handleSignupComplete = (userData: any) => {
    console.log('회원가입 완료:', userData)
    saveSession(userData)
    setUserInfo(userData)
    setAppState('dashboard')
  }

  // 로그아웃 핸들러
  const handleLogout = () => {
    console.log('로그아웃')
    clearSession()
    setUserInfo(null)
    setKakaoUserInfo(null)
    setAppState('login')
    setIsSplashVisible(true) // Reset splash for next login
    setIsExitingSplash(false)
  }

  const handleBackToLogin = () => {
    setAppState('login')
    setKakaoUserInfo(null)
    setError("")
  }

  // 사용자 정보 업데이트 핸들러
  const handleUserUpdate = (updatedUser: any) => {
    console.log('App-wrapper에서 사용자 정보 업데이트:', updatedUser)
    saveSession(updatedUser)
    setUserInfo(updatedUser)
  }

  // 회원가입 화면 (No splash animation needed here usually)
  if (appState === 'signup' && kakaoUserInfo) {
    return (
      <UserSignup
        kakaoUserInfo={kakaoUserInfo}
        onSignupComplete={handleSignupComplete}
        onBack={handleBackToLogin}
      />
    )
  }

  return (
    <>
      {/* Dashboard Layer - Always rendered if we have data, sits behind splash */}
      {userInfo && (
        <div className="relative z-0">
          <Dashboard userInfo={userInfo} onUserUpdate={handleUserUpdate} onLogout={handleLogout} />
        </div>
      )}

      {/* Splash / Login Screen Layer */}
      {isSplashVisible && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-end pb-24 transition-all duration-1000 ease-in-out origin-center ${isExitingSplash ? 'scale-[50] opacity-0 pointer-events-none' : 'scale-100 opacity-100'
            }`}
          style={{ backgroundColor: '#000000' }}
        >
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url('${(appState === 'loading' || isLoading || kakaoLoading || isExitingSplash) ? '/loading_page_02.jpg' : '/loading_page_01.jpg'}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />

          <div className="relative z-10 w-full max-w-md px-6">
            {(appState === 'loading' || isLoading || kakaoLoading) ? (
              // Loading State
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-lg">
                  {kakaoLoading ? '카카오 SDK 로딩 중...' :
                    kakaoUserInfo || isLoading ? '사용자 정보 확인 중...' :
                      '로그인 확인 중...'}
                </p>
              </div>
            ) : (
              // Login State
              <Card className="w-full bg-transparent border-none shadow-none">
                <CardHeader className="text-center pb-2">
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-white">
                      <AlertCircle className="h-4 w-4 text-red-200" />
                      <AlertDescription className="text-red-100">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleKakaoLogin}
                    className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-bold h-12 text-lg border-none"
                    size="lg"
                    disabled={isLoading || !isKakaoReady}
                  >
                    {isLoading ? '로그인 중...' : !isKakaoReady ? 'SDK 로딩 중...' : '카카오로 시작하기'}
                  </Button>
                  <p className="text-xs text-center text-black/80 drop-shadow-sm">
                    최초 로그인시 자동으로 팀 가입 화면으로 이동합니다
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  )
}
