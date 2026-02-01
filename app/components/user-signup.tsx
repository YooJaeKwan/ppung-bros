"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, AlertCircle, CheckCircle } from "lucide-react"
import { regionData, provinceOptions } from "@/lib/region-data"

interface UserSignupProps {
  kakaoUserInfo: any
  onSignupComplete: (userData: any) => void
  onBack?: () => void
}

export function UserSignup({ kakaoUserInfo, onSignupComplete, onBack }: UserSignupProps) {
  const [formData, setFormData] = useState({
    realName: "",
    phoneNumber: "",
    birthYear: "",
    region: "",
    city: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // 실명 검증
    if (!formData.realName.trim()) {
      newErrors.realName = "실명을 입력해주세요."
    } else if (formData.realName.trim().length < 2) {
      newErrors.realName = "실명은 2글자 이상 입력해주세요."
    }

    // 전화번호 검증
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "전화번호를 입력해주세요."
    } else {
      const phoneRegex = /^010\d{8}$/
      if (!phoneRegex.test(formData.phoneNumber)) {
        newErrors.phoneNumber = "올바른 전화번호 형식이 아닙니다. (예: 01012345678)"
      }
    }

    // 출생연도 검증
    if (!formData.birthYear) {
      newErrors.birthYear = "출생연도를 선택해주세요."
    }

    // 거주 지역 검증
    if (!formData.region) {
      newErrors.region = "시도를 선택해주세요."
    } else if (!formData.city) {
      newErrors.city = "구/시를 선택해주세요."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 입력 시 해당 필드 에러 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handlePhoneChange = (value: string) => {
    // 숫자만 허용하고 11자리 제한
    const numbersOnly = value.replace(/\D/g, '').slice(0, 11)
    handleInputChange('phoneNumber', numbersOnly)
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // 회원가입 데이터 구성
      const signupData = {
        // 카카오 정보
        kakaoId: kakaoUserInfo.id,
        nickname: kakaoUserInfo.properties?.nickname || '카카오 사용자',
        profileImage: kakaoUserInfo.properties?.profile_image || null,

        // 입력 정보
        realName: formData.realName.trim(),
        phoneNumber: formData.phoneNumber,
        birthYear: formData.birthYear,
        region: formData.region,
        city: formData.city
      }

      console.log('회원가입 요청 데이터:', signupData)

      // 실제 API 호출로 사용자 정보 저장
      const response = await fetch('/api/user/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '회원가입 처리 중 오류가 발생했습니다.')
      }

      console.log('회원가입 성공:', result)
      onSignupComplete(result.user)

    } catch (error) {
      console.error('회원가입 처리 중 오류:', error)

      let errorMessage = '회원가입 처리 중 오류가 발생했습니다.'

      if (error instanceof Error) {
        errorMessage = error.message
      }

      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            안녕하세요, {kakaoUserInfo.properties?.nickname || '카카오 사용자'}님!
            <br />추가 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* 실명 입력 */}
          <div className="space-y-2">
            <Label htmlFor="realName">실명 *</Label>
            <Input
              id="realName"
              type="text"
              placeholder="실명을 입력해주세요"
              value={formData.realName}
              onChange={(e) => handleInputChange('realName', e.target.value)}
              className={errors.realName ? "border-red-500" : ""}
            />
            {errors.realName && (
              <p className="text-sm text-red-500">{errors.realName}</p>
            )}
          </div>

          {/* 전화번호 입력 */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">전화번호 *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="01012345678 (하이픈 없이)"
              value={formData.phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={errors.phoneNumber ? "border-red-500" : ""}
              maxLength={11}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-500">{errors.phoneNumber}</p>
            )}
          </div>

          {/* 출생연도 선택 */}
          <div className="space-y-2">
            <Label>출생연도 *</Label>
            <Select
              value={formData.birthYear}
              onValueChange={(value) => handleInputChange('birthYear', value)}
            >
              <SelectTrigger className={errors.birthYear ? "border-red-500" : ""}>
                <SelectValue placeholder="출생연도를 선택해주세요" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.birthYear && (
              <p className="text-sm text-red-500">{errors.birthYear}</p>
            )}
            <div className="text-xs text-muted-foreground">
              팀 편성 시 연령대별 밸런스를 맞추는 데 활용됩니다.
            </div>
          </div>

          {/* 거주 지역 선택 (2단계) */}
          <div className="space-y-3">
            {/* 시도 선택 */}
            <div className="space-y-2">
              <Label>지역</Label>
              <Select
                value={formData.region}
                onValueChange={(value) => {
                  handleInputChange('region', value)
                  handleInputChange('city', "") // 시도 변경 시 구/시 초기화
                }}
              >
                <SelectTrigger className={errors.region ? "border-red-500" : ""}>
                  <SelectValue placeholder="시도를 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {provinceOptions.map((province) => (
                    <SelectItem key={province.value} value={province.value}>
                      {province.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.region && (
                <p className="text-sm text-red-500">{errors.region}</p>
              )}
            </div>

            {/* 구/시 선택 */}
            {formData.region && (
              <div className="space-y-2">
                <Label>시군구</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => handleInputChange('city', value)}
                >
                  <SelectTrigger className={errors.city ? "border-red-500" : ""}>
                    <SelectValue placeholder="구/시를 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionData[formData.region as keyof typeof regionData]?.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city}</p>
                )}
              </div>
            )}
          </div>

          {/* 버튼 영역 */}
          <div className="flex flex-col space-y-2 pt-4">
            <Button
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>회원가입 중...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>회원가입 완료</span>
                </div>
              )}
            </Button>

            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
              >
                이전으로
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            입력하신 정보는 팀 매칭 및 관리 목적으로만 사용됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
