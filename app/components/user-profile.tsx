"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Edit, Save, MapPin, Trophy, TrendingUp, Calendar as CalendarDays, Award, Clock, Calendar as CalendarIcon } from "lucide-react"
import { regionData, provinceOptions } from "@/lib/region-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getLevelLabel } from '@/lib/level-system'


interface UserProfileProps {
  userInfo: any
  onUserUpdate: (updatedUser: any) => void
}

export function UserProfile({ userInfo, onUserUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    realName: userInfo?.realName || "",
    phoneNumber: userInfo?.phoneNumber || "",
    region: userInfo?.region || "",
    city: userInfo?.city || ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 포지션 관련 설정 제거됨

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

    // 거주 지역 검증
    if (!formData.region) {
      newErrors.region = "시도를 선택해주세요."
    } else if (!formData.city) {
      newErrors.city = "구/시를 선택해주세요."
    }

    // 등번호 검증 제거됨

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

  // 등번호 입력 핸들러 제거됨

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const updateData = {
        userId: userInfo?.id,
        realName: formData.realName.trim(),
        phoneNumber: formData.phoneNumber,
        region: formData.region,
        city: formData.city
      }

      console.log('정보 수정 요청:', updateData)

      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '정보 수정 중 오류가 발생했습니다.')
      }

      console.log('정보 수정 성공:', result)

      // 업데이트된 사용자 정보로 상위 컴포넌트 업데이트
      onUserUpdate(result.user)

      setIsEditing(false)
      setErrors({})

    } catch (error) {
      console.error('정보 수정 중 오류:', error)

      let errorMessage = '정보 수정 중 오류가 발생했습니다.'

      if (error instanceof Error) {
        errorMessage = error.message
      }

      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // 원래 값으로 되돌리기
    setFormData({
      realName: userInfo?.realName || "",
      phoneNumber: userInfo?.phoneNumber || "",
      region: userInfo?.region || "",
      city: userInfo?.city || ""
    })
    setErrors({})
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [attendanceStats, setAttendanceStats] = useState({ attended: 0, total: 0, rate: 0 })
  const [recentMatches, setRecentMatches] = useState<any[]>([])
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [selectedBadge, setSelectedBadge] = useState<any>(null)

  // Fetch stats logic
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/dashboard/stats?userId=${userInfo.id}`)
        const result = await response.json()
        if (result.success && result.data) {
          setAttendanceStats(result.data.stats.attendance)
          setRecentMatches(result.data.recentMatches)
          setUserBadges(result.data.badges)
        }
      } catch (error) {
        console.error('통계 데이터 조회 오류:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }
    if (userInfo?.id) fetchStats()
  }, [userInfo?.id])

  const getPositionColor = (position: string) => {
    const pos = position.toUpperCase()
    if (pos === 'GK') return 'border-purple-400/50 text-purple-600 bg-purple-50'
    if (pos.includes('B') || pos.includes('D')) return 'border-green-400/50 text-green-600 bg-green-50'
    if (pos.includes('M') || pos.includes('C')) return 'border-blue-400/50 text-blue-600 bg-blue-50'
    if (pos.includes('W') || pos.includes('F') || pos.includes('S')) return 'border-red-400/50 text-red-600 bg-red-50'
    return 'border-slate-400/50 text-slate-600 bg-slate-50'
  }

  return (
    <div className="space-y-6">
      {/* 프로필 헤더 */}
      <Card>
        <CardHeader>
          {/* 프로필 이미지와 기본 정보 */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userInfo?.profileImage || "/placeholder.svg"} />
              <AvatarFallback className="text-lg">
                {(userInfo?.realName || userInfo?.nickname)?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">{userInfo?.realName || userInfo?.nickname}</h3>
                <Badge
                  variant="outline"
                  className={`text-xs ${(() => {
                    const level = userInfo?.level || 1
                    if (level === 1) return 'bg-gray-50 text-gray-600 border-gray-200'
                    if (level <= 6) return 'bg-blue-50 text-blue-600 border-blue-200'
                    if (level <= 9) return 'bg-purple-50 text-purple-600 border-purple-200'
                    return 'bg-yellow-50 text-yellow-600 border-yellow-200'
                  })()}`}
                >
                  {getLevelLabel(userInfo?.level)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                가입일: {userInfo?.registeredAt ? new Date(userInfo.registeredAt).toLocaleDateString('ko-KR') : '정보 없음'}
              </p>
            </div>
          </div>
        </CardHeader>

        {/* 정보 수정 버튼을 Card 하단에 배치 */}
        {!isEditing && (
          <CardContent className="pt-0">
            <div className="flex justify-center">
              <Button
                onClick={handleEdit}
                variant="default"
                size="sm"
                className="w-full max-w-xs"
              >
                <Edit className="h-4 w-4 mr-2" />
                정보 수정
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 나의 통계 정보 */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              나의 활동 통계
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            {isLoadingStats ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                {/* Attendance Rate */}
                <div className="pb-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                      <span>올해 출석률</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{attendanceStats.total}경기</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                          style={{ width: `${attendanceStats.rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{attendanceStats.rate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">{attendanceStats.attended}/{attendanceStats.total}</div>
                    </div>
                  </div>
                </div>

                {/* Recent Matches */}
                {recentMatches.length > 0 && (
                  <div className="pb-4 border-b">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <CalendarIcon className="h-4 w-4 text-purple-500" />
                      <span>최근 참석 경기</span>
                    </div>
                    <div className="space-y-2">
                      {recentMatches.map((match, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {(() => {
                                const [year, month, day] = match.date.split('-')
                                const date = new Date(Number(year), Number(month) - 1, Number(day))
                                return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground">{match.location}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Badges Section */}
                {userBadges.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Award className="h-4 w-4 text-blue-500" />
                        <span>획득 업적</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{userBadges.length}개</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {userBadges.map((userBadge: any) => {
                        const badge = userBadge.badge
                        const getTierStyles = (tier: string) => {
                          switch (tier) {
                            case 'platinum': return 'bg-slate-50 border-slate-300 ring-1 ring-slate-100'
                            case 'gold': return 'bg-yellow-50 border-yellow-300 ring-1 ring-yellow-100'
                            case 'silver': return 'bg-gray-50 border-gray-300 ring-1 ring-gray-100'
                            default: return 'bg-orange-50 border-orange-300 ring-1 ring-orange-100'
                          }
                        }

                        return (
                          <div key={userBadge.id} onClick={() => setSelectedBadge(badge)} className="flex items-center justify-center">
                            <div className="relative group cursor-pointer transition-transform duration-200 hover:scale-110">
                              <div className="w-14 h-14 rounded-full border-2 border-gray-100 bg-white p-1 shadow-sm flex items-center justify-center">
                                <div className={`w-full h-full rounded-full flex items-center justify-center border-2 ${getTierStyles(badge.tier)}`}>
                                  <span className="text-xl select-none leading-none pt-0.5">{badge.icon}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Badge Detail Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={(open) => !open && setSelectedBadge(null)}>
        <DialogContent className="w-[85vw] max-w-sm sm:max-w-[320px] p-5 rounded-2xl mx-auto">
          <DialogHeader className="gap-1">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{selectedBadge?.icon}</span>
              <span style={{ color: selectedBadge?.color }}>{selectedBadge?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-sm pt-1">
              {selectedBadge?.description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* 정보 수정 폼 */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>내 정보 수정</CardTitle>
            <CardDescription>변경할 정보를 입력해주세요.</CardDescription>
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

            {/* 포지션 선택 필드 제거됨 */}

            {/* 거주 지역 선택 (2단계) */}
            <div className="space-y-3">
              {/* <Label>거주 지역 *</Label> */}

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

              {/* 선택된 지역 표시 */}
              {/* {formData.region && formData.city && (
                <div className="text-sm text-blue-600">
                  선택된 지역: {provinceOptions.find(p => p.value === formData.region)?.label} {formData.city}
                </div>
              )} */}
            </div>

            {/* 주발 및 등번호 수정 영역 제거됨 */}

            {/* 저장 버튼 */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>저장 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>저장</span>
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* 정보 표시 모드 */
        <div className="grid gap-6 md:grid-cols-2">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>기본 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">이름</Label>
                <p className="text-base">{userInfo?.realName || '정보 없음'}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">연락처</Label>
                  <p className="text-base">{userInfo?.phoneNumber || '정보 없음'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">거주지역</Label>
                  <p className="text-base">
                    {userInfo?.region && userInfo?.city
                      ? `${provinceOptions.find(p => p.value === userInfo.region)?.label} ${userInfo.city}`
                      : '정보 없음'
                    }
                  </p>
                </div>
              </div>
              <Separator />
              {/* 주발 및 등번호 표시 영역 제거됨 */}
            </CardContent>
          </Card>

          {/* 포지션 정보 카드 삭제됨 */}
        </div>
      )}
    </div>
  )
}
