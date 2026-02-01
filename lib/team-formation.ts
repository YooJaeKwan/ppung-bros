import { LEVEL_SYSTEM, getLevelLabel } from './level-system'

// 포지션 대분류 매핑
export const positionMapping: Record<string, string> = {
  "GK": "골키퍼",
  "DC": "수비수",
  "CB": "수비수",
  "DR": "수비수",
  "RB": "수비수",
  "DL": "수비수",
  "LB": "수비수",
  "LRB": "수비수",
  "LRCB": "수비수",
  "CDM": "미드필더",
  "DM": "미드필더",
  "CM": "미드필더",
  "MC": "미드필더",
  "CAM": "미드필더",
  "AMC": "미드필더",
  "ST": "공격수",
  "CF": "공격수",
  "SS": "공격수",
  "LWF": "공격수",
  "RWF": "공격수"
}

// 포지션 카테고리 가져오기
export function getPositionCategory(position: string | null | undefined): string {
  if (!position) return '미정'
  return positionMapping[position.toUpperCase()] || '미정'
}

// 레벨 점수 계산 (선수용)
export function getPlayerLevelScore(level: number | null | undefined): number {
  if (!level || level < 1 || level > 10) return 1
  return level
}

// 레벨 점수 계산 (게스트용)
export function getGuestLevelScore(guestLevel: string | null | undefined): number {
  if (!guestLevel) return 3
  switch (guestLevel) {
    case '미숙': return 3
    case '보통': return 4
    case '잘함': return 5
    default: return 3
  }
}

// 레벨 카테고리 가져오기 (팀편성 표시용)
export function getLevelCategory(level: number | null | undefined): string {
  if (!level || level < 1 || level > 10) return '루키'
  return LEVEL_SYSTEM[level as keyof typeof LEVEL_SYSTEM]?.category || '루키'
}

// 레벨 라벨 가져오기 (팀편성 표시용)
export function getLevelLabelForFormation(level: number | null | undefined): string {
  if (!level || level < 1 || level > 10) return '루키'
  return getLevelLabel(level)
}

// Fisher-Yates 셔플 알고리즘
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// 팀 편성 함수 (3팀: 블루, 오렌지, 화이트)
export function formTeams(players: any[]): {
  blueTeam: any[],
  orangeTeam: any[],
  whiteTeam: any[],
  stats: any
} {
  if (players.length === 0) {
    return {
      blueTeam: [],
      orangeTeam: [],
      whiteTeam: [],
      stats: {
        blue: { count: 0, averageScore: 0 },
        orange: { count: 0, averageScore: 0 },
        white: { count: 0, averageScore: 0 }
      }
    }
  }

  // 1. 멤버와 게스트 분리
  const regularMembers = players.filter(p => !p.isGuest)
  const guests = players.filter(p => p.isGuest)

  // 2. 팀 초기화
  const teams: { [key: string]: any[] } = {
    blue: [],
    orange: [],
    white: []
  }
  const teamKeys = ['blue', 'orange', 'white']
  const inviterTeamMap: { [userId: string]: string } = {}

  // 3. 정규 멤버 배분 (포지션 균형 고려)
  const membersByPos: { [key: string]: any[] } = {}
  regularMembers.forEach(m => {
    const cat = getPositionCategory(m.position)
    if (!membersByPos[cat]) membersByPos[cat] = []
    membersByPos[cat].push(m)
  })

  let teamIdx = Math.floor(Math.random() * 3)
  Object.values(membersByPos).forEach(posMembers => {
    shuffle(posMembers).forEach(m => {
      const selectedTeam = teamKeys[teamIdx]
      teams[selectedTeam].push(m)
      inviterTeamMap[m.userId] = selectedTeam
      teamIdx = (teamIdx + 1) % 3
    })
  })

  // 4. 게스트 배분
  // 4-1. 초대자와 같은 팀 희망하는 게스트 먼저 처리
  const guestsToAssign = shuffle(guests)
  const remainingGuests: any[] = []

  guestsToAssign.forEach(g => {
    if (g.sameTeamAsInviter && g.invitedByUserId && inviterTeamMap[g.invitedByUserId]) {
      const targetTeam = inviterTeamMap[g.invitedByUserId]
      teams[targetTeam].push(g)
    } else {
      remainingGuests.push(g)
    }
  })

  // 4-2. 나머지 게스트 배분 (인원수가 가장 적은 팀 우선)
  remainingGuests.forEach(g => {
    // 인원수가 가장 적은 팀 찾기
    const teamCounts = teamKeys.map(key => ({ key, count: teams[key].length }))
    teamCounts.sort((a, b) => a.count - b.count)

    // 인원수가 같은 팀이 있다면 랜덤 선택
    const minCount = teamCounts[0].count
    const candidates = teamCounts.filter(t => t.count === minCount).map(t => t.key)
    const selectedTeam = candidates[Math.floor(Math.random() * candidates.length)]

    teams[selectedTeam].push(g)
  })

  // 5. 인원수 강제 균형 조정 (부득이한 경우 제외하고 최대한 맞춤)
  // 인원수가 2명 이상 차이 나면 조정
  let adjustmentLimit = 5 // 무한루프 방지
  while (adjustmentLimit > 0) {
    const counts = teamKeys.map(key => ({ key, count: teams[key].length }))
    counts.sort((a, b) => b.count - a.count)

    const largest = counts[0]
    const smallest = counts[counts.length - 1]

    if (largest.count - smallest.count > 1) {
      // 가장 많은 팀에서 가장 적은 팀으로 한 명 이동
      // 이때, '초대자와 같은 팀'인 게스트는 가급적 이동시키지 않음
      const movableIdx = teams[largest.key].findIndex(p => {
        if (!p.isGuest) return true // 정규 멤버는 이동 가능
        if (!p.sameTeamAsInviter) return true // 같은 팀 희망 안 하는 게스트 이동 가능
        return false // 같은 팀 희망하는 게스트는 보존
      })

      if (movableIdx !== -1) {
        const p = teams[largest.key].splice(movableIdx, 1)[0]
        teams[smallest.key].push(p)
        // 만약 이동한 사람이 정규 멤버라면 맵 업데이트 (후속 게스트 이동은 고려 안 함)
        if (!p.isGuest) {
          inviterTeamMap[p.userId] = smallest.key
        }
      } else {
        // 이동할 수 있는 사람이 없으면 (모두 같은 팀 희망 게스트거나 정규 멤버가 없으면 - 거의 불가능) 
        // 그냥 아무나(가장 마지막에 들어온 사람 등) 이동시켜서 인원수를 맞춤
        const p = teams[largest.key].pop()
        teams[smallest.key].push(p)
      }
      adjustmentLimit--
    } else {
      break
    }
  }

  // 통계 계산
  const calculateStats = (team: any[]) => {
    if (team.length === 0) return { count: 0, averageScore: 0 }
    const totalScore = team.reduce((sum, p) =>
      sum + (p.isGuest ? getGuestLevelScore(p.guestLevel) : getPlayerLevelScore(p.level)), 0
    )
    return {
      count: team.length,
      averageScore: Number((totalScore / team.length).toFixed(2))
    }
  }

  return {
    blueTeam: teams.blue,
    orangeTeam: teams.orange,
    whiteTeam: teams.white,
    stats: {
      blue: calculateStats(teams.blue),
      orange: calculateStats(teams.orange),
      white: calculateStats(teams.white)
    }
  }
}
