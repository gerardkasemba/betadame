// party/server.ts
import type * as Party from 'partykit/server';

// Define types for our game
interface GameState {
  board: (string | null)[];
  currentPlayer: 'white' | 'black';
  redPieces: number;
  blackPieces: number;
  status: 'open' | 'active' | 'finished' | 'closed';
  winner_id?: string | null;
  last_move_at?: string;
}

interface ClientMessage {
  type: 'move' | 'timeout' | 'resign' | 'opponent_active';
  game_id?: string;
  board?: (string | null)[];
  currentPlayer?: 'white' | 'black';
  redPieces?: number;
  blackPieces?: number;
  status?: 'open' | 'active' | 'finished' | 'closed';
  winner_id?: string | null;
  player_id?: string;
  last_move_at?: string;
}

export default class CheckersServer implements Party.Server {
  private gameState: GameState;

  constructor(readonly party: Party.Party) {
    // Initialize game state
    this.gameState = {
      board: Array(64).fill(null).map((_, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        
        // Set up initial checkers board
        if (row < 3 && (row + col) % 2 === 1) return 'bp'; // Black pieces
        if (row > 4 && (row + col) % 2 === 1) return 'wp'; // White pieces
        return null;
      }),
      currentPlayer: 'white',
      redPieces: 12,
      blackPieces: 12,
      status: 'open',
      last_move_at: new Date().toISOString()
    };
  }

  onConnect(connection: Party.Connection) {
    // Send current game state to newly connected client
    connection.send(JSON.stringify({
      type: 'state_update',
      ...this.gameState
    }));
  }

  onMessage(message: string, connection: Party.Connection) {
    try {
      const data: ClientMessage = JSON.parse(message);
      
      switch (data.type) {
        case 'move':
          this.handleMove(data, connection);
          break;
          
        case 'timeout':
          this.handleTimeout(data);
          break;
          
        case 'resign':
          this.handleResign(data);
          break;
          
        case 'opponent_active':
          // Just forward the opponent activity notification
          this.party.broadcast(JSON.stringify({
            type: 'opponent_active',
            player_id: data.player_id
          }), [connection.id]); // Send to all except the sender
          break;
          
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  private handleMove(data: ClientMessage, connection: Party.Connection) {
    // Validate the move (in a real game, you'd want more validation)
    if (!data.board || !data.currentPlayer || data.redPieces === undefined || data.blackPieces === undefined) {
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Invalid move data'
      }));
      return;
    }

    // Update game state
    this.gameState = {
      board: data.board,
      currentPlayer: data.currentPlayer,
      redPieces: data.redPieces,
      blackPieces: data.blackPieces,
      status: data.status || 'active',
      winner_id: data.winner_id || null,
      last_move_at: data.last_move_at || new Date().toISOString()
    };

    // Broadcast updated state to all clients
    this.party.broadcast(JSON.stringify({
      type: 'move',
      ...this.gameState,
      player_id: data.player_id
    }));
  }

  private handleTimeout(data: ClientMessage) {
    // Handle timeout - switch player
    if (!data.board || !data.currentPlayer || data.redPieces === undefined || data.blackPieces === undefined) {
      return;
    }

    this.gameState = {
      board: data.board,
      currentPlayer: data.currentPlayer,
      redPieces: data.redPieces,
      blackPieces: data.blackPieces,
      status: data.status || 'active',
      winner_id: data.winner_id || null,
      last_move_at: data.last_move_at || new Date().toISOString()
    };

    // Broadcast timeout to all clients
    this.party.broadcast(JSON.stringify({
      type: 'timeout',
      ...this.gameState
    }));
  }

  private handleResign(data: ClientMessage) {
    // Handle resignation
    this.gameState.status = 'finished';
    this.gameState.winner_id = data.winner_id || null;

    // Broadcast resignation to all clients
    this.party.broadcast(JSON.stringify({
      type: 'resign',
      status: this.gameState.status,
      winner_id: this.gameState.winner_id,
      player_id: data.player_id
    }));
  }

  async onRequest(request: Party.Request) {
    // Return current game state
    return new Response(JSON.stringify({
      id: this.party.id,
      ...this.gameState
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}