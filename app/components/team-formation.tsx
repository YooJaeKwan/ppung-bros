'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

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
  if (!teamFormation) return null

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

  const blueTeam = teamFormation.blueTeam || []
  const orangeTeam = teamFormation.orangeTeam || []
  const whiteTeam = teamFormation.whiteTeam || []
  const stats = teamFormation.stats || {}

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

  const renderTeamCard = (teamName: string, players: any[], teamStats: any, colorClass: string, dotColor: string) => {
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
                      <div key={player.userId} className="flex items-center gap-2 py-1 rounded">
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">
                            {player.name}
                            {player.isGuest && player.invitedByName && (
                              <span className="text-gray-400 text-xs ml-1">({player.invitedByName} 지인)</span>
                            )}
                          </p>
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
          {formationConfirmed && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              확정됨
            </Badge>
          )}
        </div>
        {isManagerMode && (
          <div className="flex gap-2">
            {!formationConfirmed && (
              <Button onClick={handleConfirm} size="sm" variant="default">
                확정
              </Button>
            )}
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {formationDate && (
        <p className="text-xs text-gray-500 text-left">
          편성 일시: {new Date(formationDate).toLocaleString('ko-KR')}
        </p>
      )}

      <div className={`grid grid-cols-1 ${orangeTeam.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {renderTeamCard('블루팀', blueTeam, stats.blue, 'border-blue-300 bg-blue-50/30', 'bg-blue-500')}
        {orangeTeam.length > 0 && renderTeamCard('오렌지팀', orangeTeam, stats.orange, 'border-orange-300 bg-orange-50/30', 'bg-orange-500')}
        {renderTeamCard('화이트팀', whiteTeam, stats.white, 'border-gray-200 bg-gray-50/30', 'bg-white border')}
      </div>
    </div>
  )
}
