'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Edit, Save, X } from 'lucide-react'
import { calculateTeamStats } from '@/lib/team-formation' // For recalculating stats

interface TeamFormationProps {
  scheduleId: string
  teamFormation: any
  formationDate: string | null
  formationConfirmed?: boolean
  isManagerMode: boolean
  currentUserId: string
  onFormationUpdate: () => void
  onFormationDelete: () => void
  onFormationConfirm: () => void
}

export function TeamFormation({
  scheduleId,
  teamFormation,
  formationDate,
  formationConfirmed = false,
  isManagerMode,
  currentUserId,
  onFormationUpdate,
  onFormationDelete,
  onFormationConfirm
}: TeamFormationProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedFormation, setEditedFormation] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (!teamFormation) return null

  const handleEditClick = () => {
    // Deep copy current formation to start editing
    setEditedFormation(JSON.parse(JSON.stringify(teamFormation)))
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedFormation(null)
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/schedule/team-formation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          userId: currentUserId,
          teamFormation: editedFormation
        })
      })

      const result = await response.json()
      if (response.ok && result.success) {
        onFormationUpdate()
        setIsEditing(false)
        setEditedFormation(null)
      } else {
        alert(result.error || '팀편성 수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('팀편성 수정 오류:', error)
      alert('팀편성 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMemberMove = (memberId: string, currentTeam: string, newTeam: string) => {
    if (currentTeam === newTeam) return

    const newFormation = { ...editedFormation }

    // Find member
    const teamMap: { [key: string]: string } = { blue: 'blueTeam', orange: 'orangeTeam', white: 'whiteTeam' }
    const currentTeamKey = teamMap[currentTeam]
    const newTeamKey = teamMap[newTeam]

    if (!newFormation[currentTeamKey] || !newFormation[newTeamKey]) return

    const memberIndex = newFormation[currentTeamKey].findIndex((m: any) => (m.userId || m.id) === memberId)
    if (memberIndex === -1) return

    const [member] = newFormation[currentTeamKey].splice(memberIndex, 1)
    newFormation[newTeamKey].push(member)

    // Recalculate stats
    newFormation.stats[currentTeam] = calculateTeamStats(newFormation[currentTeamKey])
    newFormation.stats[newTeam] = calculateTeamStats(newFormation[newTeamKey])

    setEditedFormation(newFormation)
  }

  const handleConfirm = async () => {
    if (!confirm('팀편성을 확정하시겠습니까? 확정 후에는 모든 팀원이 볼 수 있습니다.')) return

    try {
      const response = await fetch('/api/schedule/confirm-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          userId: currentUserId
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onFormationConfirm()
      } else {
        alert(result.error || '팀편성 확정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('팀편성 확정 오류:', error)
      alert('팀편성 확정 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('팀편성 결과를 삭제하시겠습니까?')) return

    try {
      const response = await fetch('/api/schedule/team-formation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          userId: currentUserId
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onFormationDelete()
      } else {
        alert(result.error || '팀편성 삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('팀편성 삭제 오류:', error)
      alert('팀편성 삭제 중 오류가 발생했습니다.')
    }
  }

  const currentFormation = isEditing ? editedFormation : teamFormation
  const blueTeam = currentFormation?.blueTeam || []
  const orangeTeam = currentFormation?.orangeTeam || []
  const whiteTeam = currentFormation?.whiteTeam || []
  const stats = currentFormation?.stats || {}

  const groupMembers = (team: any[]) => {
    const grouped: { [key: string]: any[] } = {
      '멤버': [],
      '게스트': []
    }

    team.forEach(player => {
      if (player.isGuest) {
        grouped['게스트'].push(player)
      } else {
        grouped['멤버'].push(player)
      }
    })

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    })

    return grouped
  }

  const renderTeamCard = (teamId: string, teamName: string, players: any[], teamStats: any, colorClass: string, dotColor: string) => {
    const grouped = groupMembers(players)

    return (
      <Card className={`${colorClass}`}>
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${dotColor}`}></div>
            {teamName}
            {teamStats && (
              <span className="text-sm font-normal text-gray-600">
                ({teamStats.count}명, 평균 레벨: {teamStats.averageScore})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-3">
            {players.length === 0 ? (
              <p className="text-sm text-gray-500">팀원이 없습니다.</p>
            ) : (
              Object.entries(grouped)
                .filter(([_, list]) => list.length > 0)
                .sort(([a], [b]) => {
                  const order = ['멤버', '게스트']
                  return order.indexOf(a) - order.indexOf(b)
                })
                .map(([category, list]) => (
                  <div key={category} className="space-y-1">
                    <div className="text-xs font-semibold text-gray-600 border-b pb-1 text-left">
                      {category} ({list.length})
                    </div>
                    {list.map((player: any) => (
                      <div key={player.userId || player.id} className="flex items-center gap-2 py-1 rounded">
                        <div className="flex-1 min-w-0 text-left flex items-center">
                          <p className={`text-sm font-medium truncate ${isEditing ? 'mr-2' : ''}`}>
                            {player.name}
                            {player.isGuest && player.invitedByName && (
                              <span className="text-gray-400 text-xs ml-1">({player.invitedByName} 지인)</span>
                            )}
                          </p>
                          {isEditing && (
                            <Select
                              value={teamId}
                              onValueChange={(newTeam) => handleMemberMove(player.userId || player.id, teamId, newTeam)}
                            >
                              <SelectTrigger className="w-[90px] h-7 text-xs ml-auto shrink-0 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="blue">블루팀</SelectItem>
                                {orangeTeam.length > 0 && <SelectItem value="orange">오렌지팀</SelectItem>}
                                <SelectItem value="white">화이트팀</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">팀편성 결과</h3>
          {formationConfirmed && !isEditing && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              확정됨
            </Badge>
          )}
        </div>
        {isManagerMode && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSaveEdit} disabled={isSaving} size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 h-8">
                  {isSaving ? "저장 중..." : <><Save className="h-4 w-4 mr-1" />저장</>}
                </Button>
                <Button onClick={handleCancelEdit} disabled={isSaving} size="sm" variant="outline" className="h-8">
                  <X className="h-4 w-4 mr-1" />취소
                </Button>
              </>
            ) : (
              <>
                {!formationConfirmed && (
                  <>
                    <Button onClick={handleEditClick} size="sm" variant="outline" className="h-8">
                      <Edit className="h-4 w-4 mr-1" />수동 편성
                    </Button>
                    <Button onClick={handleConfirm} size="sm" variant="default" className="h-8">
                      확정
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleDelete}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="팀편성 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {formationDate && !isEditing && (
        <p className="text-xs text-gray-500 text-left">
          편성 일시: {new Date(formationDate).toLocaleString('ko-KR')}
        </p>
      )}

      <div className={`grid grid-cols-1 ${orangeTeam.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {renderTeamCard('blue', '블루팀', blueTeam, stats.blue, 'border-blue-300 bg-blue-50/30', 'bg-blue-500')}
        {orangeTeam.length > 0 && renderTeamCard('orange', '오렌지팀', orangeTeam, stats.orange, 'border-orange-300 bg-orange-50/30', 'bg-orange-500')}
        {renderTeamCard('white', '화이트팀', whiteTeam, stats.white, 'border-gray-200 bg-gray-50/30', 'bg-white border')}
      </div>
    </div>
  )
}
