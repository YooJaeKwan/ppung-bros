'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Users, Calendar as CalendarIcon, Edit3, Save, Trash2, X } from 'lucide-react'
import * as XLSX from 'xlsx'

interface UserStat {
    id: string
    name: string
    position: string
    attendedCount: number
    totalSchedules: number
    rate: number
}

interface ScheduleInfo {
    id: string
    date: string
    title: string
    type: string
}

interface AttendanceData {
    users: UserStat[]
    schedules: ScheduleInfo[]
    matrix: Record<string, Record<string, 'O' | 'X' | '-'>>
}

export function AttendanceStatsView({ isManagerMode, currentUser }: { isManagerMode?: boolean, currentUser?: any }) {
    const [data, setData] = useState<AttendanceData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'rate', direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })
    
    // 편집 관련 상태
    const [isEditing, setIsEditing] = useState(false)
    const [editedUpdates, setEditedUpdates] = useState<{scheduleId: string, targetUserId: string, status: 'O' | 'X' | '-'}[]>([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/attendance/stats/all')
            const result = await response.json()

            if (result.success) {
                setData(result.data)
            } else {
                setError(result.error || '데이터를 불러오는데 실패했습니다.')
            }
        } catch (err) {
            setError('네트워크 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    // 출석률 등급 계산 함수
    const getGrade = (rate: number): { grade: string; color: string } => {
        if (rate >= 80) return { grade: 'A', color: 'text-green-600 bg-green-100' }
        if (rate >= 60) return { grade: 'B', color: 'text-blue-600 bg-blue-100' }
        if (rate >= 40) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100' }
        if (rate >= 20) return { grade: 'D', color: 'text-orange-600 bg-orange-100' }
        return { grade: 'E', color: 'text-red-600 bg-red-100' }
    }

    const handleSort = (key: 'name' | 'rate') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }))
    }

    const getSortedUsers = () => {
        if (!data) return []
        const sortedUsers = [...data.users]
        sortedUsers.sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name, 'ko') : b.name.localeCompare(a.name, 'ko')
            } else if (sortConfig.key === 'rate') {
                return sortConfig.direction === 'asc' ? a.rate - b.rate : b.rate - a.rate
            }
            return 0
        })
        return sortedUsers
    }

    const handleCellClick = (scheduleId: string, userId: string, currentStatus: 'O' | 'X' | '-') => {
        if (!isEditing) return

        let nextStatus: 'O' | 'X' | '-' = '-'
        if (currentStatus === 'O') nextStatus = 'X'
        else if (currentStatus === 'X') nextStatus = '-'
        else if (currentStatus === '-') nextStatus = 'O'

        // Apply locally to data.matrix
        const newData = { ...data! }
        newData.matrix[userId][scheduleId] = nextStatus
        setData(newData)

        // Add to editedUpdates
        setEditedUpdates(prev => {
            const existingIndex = prev.findIndex(u => u.scheduleId === scheduleId && u.targetUserId === userId)
            if (existingIndex >= 0) {
                const newUpdates = [...prev]
                newUpdates[existingIndex].status = nextStatus
                return newUpdates
            } else {
                return [...prev, { scheduleId, targetUserId: userId, status: nextStatus }]
            }
        })
    }

    const handleDeleteSchedule = async (scheduleId: string) => {
        if (!confirm('이 일정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 출석 기록도 모두 삭제됩니다.')) return
        try {
            const response = await fetch('/api/schedule/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduleId, userId: currentUser?.id })
            })
            if (response.ok) {
                alert('일정이 삭제되었습니다.')
                fetchData()
            } else {
                const result = await response.json()
                alert(result.error || '삭제 실패')
            }
        } catch (error) {
            alert('오류가 발생했습니다.')
        }
    }

    const handleSave = async () => {
        if (editedUpdates.length === 0) {
            setIsEditing(false)
            return
        }
        setIsSaving(true)
        try {
            const response = await fetch('/api/attendance/stats/update-bulk', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: editedUpdates, userId: currentUser?.id })
            })
            if (response.ok) {
                alert('출석부가 수정되었습니다.')
                setEditedUpdates([])
                setIsEditing(false)
                fetchData()
            } else {
                const result = await response.json()
                alert(result.error || '저장 실패')
            }
        } catch (error) {
            alert('오류가 발생했습니다.')
        } finally {
            setIsSaving(false)
        }
    }

    // 전체 평균 출석률 계산
    const averageRate = data ?
        Math.round((data.users.reduce((sum, u) => sum + u.rate, 0) / data.users.length) * 10) / 10
        : 0

    const handleExportExcel = () => {
        if (!data) return

        // 엑셀 데이터 구성
        const headers = ['이름', '출석률', '등급', ...data.schedules.map(s => s.date)]
        const rows = data.users.map(user => {
            const row = [
                user.name,
                `${user.rate}%`,
                getGrade(user.rate).grade,
                ...data.schedules.map(s => data.matrix[user.id]?.[s.id] || '-')
            ]
            return row
        })

        const wsData = [headers, ...rows]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '출석부')

        // 파일 다운로드
        XLSX.writeFile(wb, `FC_BRO_출석부_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-red-500">{error}</p>
                    <Button onClick={fetchData} className="mt-4 mx-auto block">
                        다시 시도
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (!data || data.users.length === 0) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">출석 데이터가 없습니다.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
                            <Users className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-sm font-medium text-slate-700">{data.users.length}명</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
                            <CalendarIcon className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-sm font-medium text-slate-700">{data.schedules.length}경기</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 rounded-full">
                            <span className="text-sm text-blue-600">평균</span>
                            <span className="text-sm font-bold text-blue-700">{averageRate}%</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isManagerMode && !isEditing && (
                        <Button variant="outline" size="sm" className="px-2.5 sm:px-3" onClick={() => setIsEditing(true)}>
                            <Edit3 className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">편집 모드</span>
                        </Button>
                    )}
                    {isManagerMode && isEditing && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => {
                                setIsEditing(false)
                                setEditedUpdates([])
                                fetchData() // discard changes
                            }}>
                                취소
                            </Button>
                            <Button size="sm" className="px-2.5 sm:px-3" onClick={handleSave} disabled={isSaving}>
                                <Save className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">{isSaving ? '저장 중...' : '저장'}</span>
                            </Button>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border px-2 py-2 text-center min-w-[50px]">등급</th>
                                <th 
                                    className="sticky left-0 bg-gray-50 text-center z-10 border px-2 py-2 text-left min-w-[70px] whitespace-nowrap cursor-pointer hover:bg-gray-200"
                                    onClick={() => handleSort('name')}
                                >
                                    이름 {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                </th>
                                <th 
                                    className="border px-2 py-2 text-center min-w-[50px] whitespace-nowrap cursor-pointer hover:bg-gray-200"
                                    onClick={() => handleSort('rate')}
                                >
                                    출석률 {sortConfig.key === 'rate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                </th>
                                {data.schedules.map(schedule => (
                                    <th
                                        key={schedule.id}
                                        className="border px-1 py-2 text-center min-w-[50px] relative group"
                                        title={schedule.title}
                                    >
                                        <div className="text-xs text-gray-500">
                                            {schedule.date.slice(5)}
                                        </div>
                                        {isEditing && (
                                            <button 
                                                onClick={() => handleDeleteSchedule(schedule.id)}
                                                className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                title="일정 삭제"
                                            >
                                                <Trash2 className="h-3 w-3 text-red-500" />
                                            </button>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedUsers().map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className={`border px-2 py-1.5 text-center font-bold whitespace-nowrap ${getGrade(user.rate).color}`}>
                                        {getGrade(user.rate).grade}
                                    </td>
                                    <td className="sticky left-0 bg-white z-10 text-center border px-2 py-1.5 font-medium min-w-[70px] whitespace-nowrap">
                                        {user.name}
                                    </td>
                                    <td className={`border px-2 py-1.5 text-center font-semibold ${user.rate >= 80 ? 'text-green-600' :
                                        user.rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                        {user.rate}%
                                    </td>
                                    {data.schedules.map(schedule => {
                                        const status = data.matrix[user.id]?.[schedule.id] || '-'
                                        const isEdited = editedUpdates.some(u => u.scheduleId === schedule.id && u.targetUserId === user.id)
                                        return (
                                            <td
                                                key={schedule.id}
                                                onClick={() => handleCellClick(schedule.id, user.id, status)}
                                                className={`border px-1 py-1.5 text-center ${
                                                    isEditing ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
                                                } ${
                                                    status === 'O' ? 'text-green-600 bg-green-50' :
                                                    status === 'X' ? 'text-red-600 bg-red-50' : 'text-gray-400'
                                                } ${isEdited ? 'ring-2 ring-inset ring-blue-400 relative z-10' : ''}`}
                                            >
                                                {status}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>

            <div>
                <Button onClick={handleExportExcel} size="sm" className="gap-2 mb-4 ml-5">
                    <Download className="h-4 w-4" />
                    다운로드
                </Button>
            </div>
        </Card>
    )
}
