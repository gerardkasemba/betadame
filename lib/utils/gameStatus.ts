// lib/utils/gameStatus.ts

/**
 * Utility functions for determining game live status based on dates and timezones
 */

interface GameTime {
  game_date?: string
  end_date?: string
  time_zone?: string
}

/**
 * Convert a date string to a Date object considering the timezone
 * @param dateString - ISO date string
 * @param timeZone - IANA timezone string (e.g., 'America/New_York', 'UTC')
 * @returns Date object
 */
export function convertToTimezone(dateString: string, timeZone?: string): Date {
  const date = new Date(dateString)
  
  if (!timeZone || timeZone === 'UTC') {
    return date
  }

  // If timezone is provided, adjust the date
  // Note: This is a simplified version. For production, consider using date-fns-tz or luxon
  try {
    // Create a formatter for the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })

    return date
  } catch (error) {
    console.warn(`Invalid timezone: ${timeZone}, falling back to UTC`)
    return date
  }
}

/**
 * Check if a game is currently live based on game_date, end_date, and time_zone
 * Game is LIVE if: game has started (game_date <= now) AND hasn't ended yet (end_date > now)
 * @param game - Object containing game_date, end_date, and optional time_zone
 * @returns boolean indicating if the game is live
 */
export function isGameLive(game: GameTime): boolean {
  if (!game.game_date || !game.end_date) {
    return false
  }

  try {
    const now = new Date()
    const gameStart = new Date(game.game_date)
    const gameEnd = new Date(game.end_date)

    // Game is live if it has started AND hasn't ended yet
    const hasStarted = now >= gameStart
    const hasNotEnded = now < gameEnd

    return hasStarted && hasNotEnded
  } catch (error) {
    console.error('Error checking game live status:', error)
    return false
  }
}

/**
 * Check if a game is upcoming (hasn't started yet)
 * @param game - Object containing game_date
 * @returns boolean indicating if the game is upcoming
 */
export function isGameUpcoming(game: GameTime): boolean {
  if (!game.game_date) {
    return false
  }

  try {
    const now = new Date()
    const gameStart = new Date(game.game_date)
    
    return now < gameStart
  } catch (error) {
    console.error('Error checking if game is upcoming:', error)
    return false
  }
}

/**
 * Check if a game has ended
 * @param game - Object containing end_date
 * @returns boolean indicating if the game has ended
 */
export function isGameEnded(game: GameTime): boolean {
  if (!game.end_date) {
    return false
  }

  try {
    const now = new Date()
    const gameEnd = new Date(game.end_date)
    
    return now > gameEnd
  } catch (error) {
    console.error('Error checking if game has ended:', error)
    return false
  }
}

/**
 * Get the status of a game
 * @param game - Object containing game_date, end_date, and optional time_zone
 * @returns 'live' | 'upcoming' | 'ended' | 'unknown'
 */
export function getGameStatus(game: GameTime): 'live' | 'upcoming' | 'ended' | 'unknown' {
  if (!game.game_date || !game.end_date) {
    return 'unknown'
  }

  if (isGameLive(game)) {
    return 'live'
  }

  if (isGameUpcoming(game)) {
    return 'upcoming'
  }

  if (isGameEnded(game)) {
    return 'ended'
  }

  return 'unknown'
}

/**
 * Format time until game starts or time remaining
 * @param game - Object containing game_date
 * @returns Formatted string like "2h 30m" or "LIVE"
 */
export function getTimeUntilGame(game: GameTime): string {
  if (!game.game_date) {
    return ''
  }

  const now = new Date()
  const gameStart = new Date(game.game_date)
  const diff = gameStart.getTime() - now.getTime()

  if (diff < 0) {
    // Game has started or is in progress
    if (game.end_date) {
      const gameEnd = new Date(game.end_date)
      if (now <= gameEnd) {
        return 'LIVE'
      }
      return 'ENDED'
    }
    return 'LIVE'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}d ${hours}h`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

/**
 * Get time remaining in a live game
 * @param game - Object containing end_date
 * @returns Formatted string like "45m remaining" or null if not applicable
 */
export function getTimeRemaining(game: GameTime): string | null {
  if (!game.end_date || !isGameLive(game)) {
    return null
  }

  const now = new Date()
  const gameEnd = new Date(game.end_date)
  const diff = gameEnd.getTime() - now.getTime()

  if (diff < 0) {
    return null
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }

  return `${minutes}m remaining`
}

/**
 * Format a date for display in the user's local timezone or specified timezone
 * @param dateString - ISO date string
 * @param timeZone - Optional IANA timezone string
 * @returns Formatted date string
 */
export function formatGameDate(dateString: string, timeZone?: string): string {
  try {
    const date = new Date(dateString)
    
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || undefined
    }

    return new Intl.DateTimeFormat('en-US', options).format(date)
  } catch (error) {
    console.error('Error formatting game date:', error)
    return dateString
  }
}