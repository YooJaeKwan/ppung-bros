'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarIcon, MapPinIcon, UsersIcon, ClockIcon, X, Check, UserPlus, UserMinus, Edit, Trash2, Trophy, ChevronDown, ChevronUp, Share2 } from 'lucide-react'
import { calculateDaysLeft, generateKakaoShareText } from '@/lib/utils'
import { AttendanceVoting } from './attendance-voting'
import { ScheduleComments } from './schedule-comments'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface ScheduleCardProps {
  compact?: boolean
  schedule: any
  currentUser: any
  isManagerMode: boolean
  isUpdating: boolean
  onAttendanceUpdate: (scheduleId: string) => void
  onAttendanceStatsUpdate: (scheduleId: string) => void
  onFormationReset: () => void
  onGuestStatusUpdate: (scheduleId: string) => void
  onDeleteSchedule: (scheduleId: string) => void
  onEditSchedule: (schedule: any) => void
  onVoteUpdate?: () => void
  hasTeamFormation?: boolean
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  currentUser,
  isManagerMode,
  isUpdating,
  onAttendanceUpdate,
  onAttendanceStatsUpdate,
  onFormationReset,
  onGuestStatusUpdate,
  onDeleteSchedule,
  onEditSchedule,
  onVoteUpdate,
  hasTeamFormation = false,
  compact = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRosterExpanded, setIsRosterExpanded] = useState(false)

  // 참석 현황 통계 계산
  const getAttendanceStats = (attendees: any[]) => {
    if (!attendees || attendees.length === 0) {
      return { attending: 0, notAttending: 0, pending: 0, total: 0, percentage: 0 }
    }

    const attending = attendees.filter(att =>
      att.status === 'attending' || att.status === 'attended'
    ).length
    const notAttending = attendees.filter(att =>
      att.status === 'not_attending' || att.status === 'not_attended'
    ).length
    const pending = attendees.filter(att => att.status === 'pending').length
    const total = attendees.length
    const percentage = total > 0 ? Math.round((attending / total) * 100) : 0

    return { attending, notAttending, pending, total, percentage }
  }

  // 사용자 참석 상태 확인
  const getUserAttendanceStatus = (schedule: any) => {
    if (!currentUser?.id || !schedule.attendees) return null
    const userAttendance = schedule.attendees.find((att: any) => att.userId === currentUser.id)
    return userAttendance?.status || null
  }

  // 일정 타입별 색상
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'internal': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'external': return 'bg-green-100 text-green-800 border-green-300'
      case 'friendly': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'match': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // 게스트 허용 상태 토글
  const handleGuestToggle = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/schedule/toggle-guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id })
      })

      if (response.ok) {
        onGuestStatusUpdate(schedule.id)
        onAttendanceUpdate(schedule.id)
      }
    } catch (error) {
      console.error('게스트 상태 토글 오류:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = getAttendanceStats(schedule.attendees)
  const daysLeft = calculateDaysLeft(schedule.date)
  const isPastSchedule = daysLeft < 0
  const userStatus = getUserAttendanceStatus(schedule)

  // 경기 결과 확인 로직 제거됨

  // 포지션별 색상 반환 함수
  const ScheduleSkeleton = () => (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-full">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span className="text-sm font-medium">참석현황 업데이트 중...</span>
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )

  // 포지션 색상 함수 제거됨 (풋살 전환)

  // 공유하기 핸들러
  const handleCopyForSharing = async () => {
    const text = generateKakaoShareText(schedule, isManagerMode)
    try {
      await navigator.clipboard.writeText(text)
      alert("경기 정보가 클립보드에 복사되었습니다.\n카카오톡 채팅창에 붙여넣기(Ctrl+V) 하세요.")
    } catch (err) {
      console.error('클립보드 복사 실패:', err)
      // 보안상 이유로 실패할 경우 fallback (모바일 등)
      prompt("아래 텍스트를 복사하세요:", text)
    }
  }


  if (compact) {
    return (
      <Card className={`mb-3 overflow-hidden transition-all hover:shadow-md border-l-4 ${daysLeft === 0 ? 'border-l-red-500' :
        daysLeft === 1 ? 'border-l-orange-500' :
          'border-l-blue-500'
        }`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">
                  {(() => {
                    const [year, month, day] = schedule.date.split('-')
                    const date = new Date(Number(year), Number(month) - 1, Number(day))
                    return date.toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })
                  })()}
                </span>
                <span className="text-blue-600 font-bold">{schedule.time}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPinIcon className="h-3 w-3" />
                {schedule.location}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={getTypeColor(schedule.type)} variant="secondary">
                {schedule.type === "internal" ? "자체" :
                  schedule.type === "match" ? `A매치${schedule.opponentTeam ? ` vs ${schedule.opponentTeam}` : ''}` : "연습"}
              </Badge>
              {!isPastSchedule && (
                <span className={`text-xs font-bold ${daysLeft === 0 ? 'text-red-600' :
                  daysLeft === 1 ? 'text-orange-600' :
                    'text-blue-600'
                  }`}>
                  {daysLeft === 0 ? "D-Day" : `D-${daysLeft}`}
                </span>
              )}
            </div>
          </div>

          {/* Voting Section */}
          {!isPastSchedule && currentUser?.id && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <AttendanceVoting
                scheduleId={schedule.id}
                currentUserId={currentUser.id}
                isPastSchedule={isPastSchedule}
                allowGuests={false}
                hasTeamFormation={!!schedule.teamFormation}
                formationConfirmed={schedule.formationConfirmed}
                isManagerMode={isManagerMode}
                onVoteUpdate={() => {
                  onVoteUpdate?.()
                  onAttendanceUpdate(schedule.id)
                }}
                initialAttendees={schedule.attendees?.map((att: any) => ({
                  userId: att.userId,
                  name: att.name,
                  status: att.status,
                  profileImage: att.profileImage || null,
                  isGuest: att.isGuest || false,
                  invitedBy: att.invitedBy
                }))}
                initialStats={stats}
                compact={true}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {isUpdating ? (
        <Card className="transition-shadow bg-gray-50 border-gray-200">
          <ScheduleSkeleton />
        </Card>
      ) : (
        /* 예정된 경기 또는 결과 없는 지난 경기: Card로 감싸기 */
        <Card className={`transition-shadow overflow-hidden ${isPastSchedule
          ? 'bg-gray-50 border-gray-200'
          : 'hover:shadow-lg border-blue-100'
          }`}>

          {/* Header Section: Date, Time, Location */}
          <div className={`px-6 py-5 border-b ${isPastSchedule ? 'bg-gray-100/50 border-gray-200' : 'bg-blue-50/30 border-blue-100'}`}>
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                {/* Date & Time */}
                <div className="flex items-baseline gap-3">
                  <h3 className={`text-2xl font-bold tracking-tight ${isPastSchedule ? 'text-gray-600' : 'text-gray-900'}`}>
                    {(() => {
                      const [year, month, day] = schedule.date.split('-')
                      const date = new Date(Number(year), Number(month) - 1, Number(day))
                      return date.toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })
                    })()}
                  </h3>
                  <span className={`text-xl font-bold ${isPastSchedule ? 'text-gray-500' : 'text-blue-600'}`}>
                    {schedule.time}
                  </span>
                </div>

                {/* Location */}
                <div className={`flex items-center gap-2 font-medium ${isPastSchedule ? 'text-gray-500' : 'text-gray-700'}`}>
                  <MapPinIcon className={`h-4 w-4 ${isPastSchedule ? 'text-gray-400' : 'text-blue-500'}`} />
                  <span>{schedule.location || '장소 미정'}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1">
                  <Badge className={getTypeColor(schedule.type)} variant="secondary">
                    {schedule.type === "internal" ? "자체경기" :
                      schedule.type === "match" ? `A매치${schedule.opponentTeam ? ` vs ${schedule.opponentTeam}` : ''}` :
                        schedule.type === "training" ? "연습" : schedule.type}
                  </Badge>
                  {isPastSchedule && (
                    <Badge variant="outline" className="text-gray-500 border-gray-300">
                      종료
                    </Badge>
                  )}
                </div>

                {/* D-Day Badge */}
                {!isPastSchedule && (
                  <Badge variant="outline" className={`${daysLeft === 0 ? 'bg-red-50 text-red-600 border-red-200' :
                    daysLeft === 1 ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                    {(() => {
                      if (daysLeft === 0) return "오늘 경기!"
                      if (daysLeft === 1) return "내일 경기!"
                      return `D-${daysLeft}`
                    })()}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <CardContent className={`p-6 ${isPastSchedule ? 'opacity-90' : ''}`}>
            <div className="space-y-6">

              {/* Scoreboard (if exists) */}
              {/* 스코어보드 제거됨 */}

              {/* Manager Buttons */}
              {isManagerMode && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    onClick={handleCopyForSharing}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-xs"
                    title="카카오톡 공유 텍스트 복사"
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    공유
                  </Button>
                  <Button
                    onClick={() => onEditSchedule(schedule)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-xs"
                    title="일정 수정"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    수정
                  </Button>
                  <Button
                    onClick={() => onDeleteSchedule(schedule.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                    title="일정 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    삭제
                  </Button>
                </div>
              )}

              {/* 경기 설명 (예정) 또는 경기 총평 (완료) */}
              {isPastSchedule ? null : (
                schedule.description && (
                  <div className="text-sm text-gray-600">
                    {schedule.description}
                  </div>
                )
              )}

              {/* 경기 결과 입력 버튼 제거됨 */}

              {/* 참석 투표 (지난 경기가 아니거나, 지난 경기여도 결과가 없을 때 보여줄 수 있음 - 정책상 지난 경기는 투표 마감) */}
              {!isPastSchedule && currentUser?.id && (
                <div className="pt-4 border-t">
                  <AttendanceVoting
                    scheduleId={schedule.id}
                    currentUserId={currentUser.id}
                    isPastSchedule={isPastSchedule}
                    allowGuests={false}
                    hasTeamFormation={!!schedule.teamFormation}
                    formationConfirmed={schedule.formationConfirmed}
                    isManagerMode={isManagerMode}
                    onVoteUpdate={() => {
                      onVoteUpdate?.()
                      onAttendanceUpdate(schedule.id)
                    }}
                    initialAttendees={schedule.attendees?.map((att: any) => ({
                      userId: att.userId,
                      name: att.name,
                      status: att.status as 'attending' | 'not_attending' | 'pending',
                      profileImage: att.profileImage || null,
                      isGuest: att.isGuest || false,
                      invitedBy: att.invitedBy
                    }))}
                    initialStats={stats}
                  />
                </div>
              )}

              {/* 댓글 섹션 */}
              {currentUser?.id && (
                <ScheduleComments
                  scheduleId={schedule.id}
                  currentUserId={currentUser.id}
                  isManagerMode={isManagerMode}
                />
              )}

            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default ScheduleCard

