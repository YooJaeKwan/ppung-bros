"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, MapPin, Trophy, TrendingUp, Calendar as CalendarDays, Award, Clock } from "lucide-react"
import { AttendanceVoting } from "./attendance-voting"
import { ScheduleComments } from "./schedule-comments"
import { TeamFormation } from "./team-formation"
import { getLevelLabel } from '@/lib/level-system'
import { BadgeNotification } from './badge-notification'
import { sortByPosition } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardHomeProps {
    currentUser: any
    onUserUpdate?: (updatedUser: any) => void
}

// React Strict Mode에서 두 번 호출 방지용 ref

// MatchStats 제거됨

interface AttendanceStats {
    attended: number
    total: number
    rate: number
}

interface RecentMatch {
    date: string
    type: string
    location: string
    result?: string
}

interface UserBadge {
    id: string
    badgeType: string
    earnedAt: string
    info: {
        name: string
        emoji: string
        description: string
    }
}

export function DashboardHome({ currentUser }: DashboardHomeProps) {
    const [nextSchedule, setNextSchedule] = useState<any>(null)
    const [selectedBadge, setSelectedBadge] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const badgeCheckDone = useRef(false) // React Strict Mode에서 두 번 호출 방지

    // Fetch all data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use optimized single endpoint
                const response = await fetch(`/api/dashboard/stats?userId=${currentUser.id}`)
                const result = await response.json()

                if (result.success && result.data) {
                    const { nextSchedule, badges } = result.data

                    // 1. Next Schedule
                    if (nextSchedule) {
                        setNextSchedule(nextSchedule)
                    }

                    // Check for new badges (background check)
                    // This is still needed to trigger new calculations if something changed recently
                    // but we can do it silently (and only once using ref)
                    if (!badgeCheckDone.current) {
                        badgeCheckDone.current = true
                        fetch('/api/user/badges/check', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUser.id })
                        }).catch(console.error)
                    }
                }
            } catch (error) {
                console.error('데이터 조회 오류:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (currentUser?.id) {
            fetchData()
        }
    }, [currentUser?.id])

    const calculateDaysLeft = (dateString: string) => {
        const [year, month, day] = dateString.split('-')
        const targetDate = new Date(Number(year), Number(month) - 1, Number(day))
        targetDate.setHours(0, 0, 0, 0)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const diffTime = targetDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return diffDays
    }

    // 포지션별 색상 반환 함수 (ScheduleCard와 동일한 스타일)
    const getPositionColor = (position: string) => {
        const pos = position.toUpperCase()
        if (pos === 'GK') return 'border-purple-400/50 text-purple-600 bg-purple-50'
        if (pos.includes('B') || pos.includes('D')) return 'border-green-400/50 text-green-600 bg-green-50' // DF
        if (pos.includes('M') || pos.includes('C')) return 'border-blue-400/50 text-blue-600 bg-blue-50' // MF
        if (pos.includes('W') || pos.includes('F') || pos.includes('S')) return 'border-red-400/50 text-red-600 bg-red-50' // FW
        return 'border-slate-400/50 text-slate-600 bg-slate-50' // Default
    }

    const user = currentUser

    return (
        <div className="space-y-6">
            {/* Badge Notification */}
            {currentUser?.id && <BadgeNotification userId={currentUser.id} />}





            {/* Dashboard Layout - Simplified */}
            <div className="grid gap-6">
                {/* Next Schedule Skeleton */}
                {isLoading && (
                    <Card className="border-l-4 border-l-gray-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <CalendarIcon className="h-5 w-5 text-gray-300" />
                                <Skeleton className="h-6 w-24" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-center">
                                <Skeleton className="h-8 w-32 rounded-full" />
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                                <Skeleton className="h-8 w-48" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Next Schedule */}
                {!isLoading && nextSchedule && (
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <CalendarIcon className="h-5 w-5" />
                                다음 일정
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* D-Day Display */}
                            <div className="flex items-center justify-center gap-3">
                                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-semibold">
                                    <CalendarIcon className="h-4 w-4" />
                                    {(() => {
                                        const daysLeft = calculateDaysLeft(nextSchedule.date)
                                        if (daysLeft === 0) return "오늘 경기!"
                                        if (daysLeft === 1) return "내일 경기!"
                                        if (daysLeft > 0) return `D-${daysLeft}`
                                        return "지난 경기"
                                    })()}
                                </div>
                            </div>

                            {/* Schedule Info */}
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold">
                                    {(() => {
                                        const [year, month, day] = nextSchedule.date.split('-')
                                        const date = new Date(Number(year), Number(month) - 1, Number(day))
                                        return date.toLocaleDateString('ko-KR', {
                                            month: 'long',
                                            day: 'numeric',
                                            weekday: 'short'
                                        })
                                    })()}
                                    <span className="text-xl font-bold"> {nextSchedule.time}</span>
                                </h3>

                                {/* 경기 시간 및 타입 */}
                                <div className="flex flex-col items-center gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className={`
                                            ${nextSchedule.type === 'internal' ? 'bg-green-100 text-green-800' :
                                                nextSchedule.type === 'match' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'}
                                        `}>
                                            {nextSchedule.type === 'internal' ? '자체경기' :
                                                nextSchedule.type === 'match' ? `A매치${nextSchedule.opponentTeam ? ` vs ${nextSchedule.opponentTeam}` : ''}` : '훈련'}
                                        </Badge>
                                    </div>
                                </div>

                                {nextSchedule.location && (
                                    <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                                        <MapPin className="h-4 w-4" />
                                        <span>{nextSchedule.location}</span>
                                    </div>
                                )}
                                {nextSchedule.description && (
                                    <p className="text-sm text-muted-foreground mt-2">{nextSchedule.description}</p>
                                )}

                                {/* 팀 편성 정보 표시 - 확정된 경우에만 표시 */}
                                {nextSchedule.teamFormation && nextSchedule.formationConfirmed && (nextSchedule.type === 'internal') && currentUser?.id && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <TeamFormation
                                            scheduleId={nextSchedule.id}
                                            teamFormation={nextSchedule.teamFormation}
                                            formationDate={nextSchedule.formationDate}
                                            formationConfirmed={nextSchedule.formationConfirmed}
                                            isManagerMode={false}
                                            currentUserId={currentUser.id}
                                            onFormationUpdate={() => { }}
                                            onFormationDelete={() => { }}
                                            onFormationConfirm={() => { }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Attendance Voting */}
                            {currentUser?.id && (
                                <div className="mt-4">
                                    <AttendanceVoting
                                        scheduleId={nextSchedule.id}
                                        currentUserId={currentUser.id}
                                        isManagerMode={currentUser.role === 'ADMIN'}
                                        isPastSchedule={calculateDaysLeft(nextSchedule.date) < 0}
                                        allowGuests={nextSchedule.allowGuests}
                                        hasTeamFormation={!!nextSchedule.teamFormation}
                                        formationConfirmed={nextSchedule.formationConfirmed}
                                        initialStats={nextSchedule.attendanceStats}
                                        initialMyStatus={nextSchedule.myAttendance?.toLowerCase() as 'attending' | 'not_attending' | 'pending'}
                                        onVoteUpdate={() => {
                                            // Next Schedule만 새로고침
                                            if (currentUser?.id) {
                                                fetch(`/api/dashboard/stats?userId=${currentUser.id}`)
                                                    .then(res => res.json())
                                                    .then(result => {
                                                        if (result.success && result.data?.nextSchedule) {
                                                            setNextSchedule(result.data.nextSchedule)
                                                        }
                                                    })
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* 댓글 섹션 */}
                            {currentUser?.id && nextSchedule && (
                                <ScheduleComments
                                    scheduleId={nextSchedule.id}
                                    currentUserId={currentUser.id}
                                    isManagerMode={currentUser.role === 'ADMIN'}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* No Schedule State */}
                {!isLoading && !nextSchedule && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center text-muted-foreground">
                                다음 일정이 없습니다.
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

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
                    {/* Tier Badge Removed as per user request */}
                </DialogContent>
            </Dialog>



        </div >
    )
}
