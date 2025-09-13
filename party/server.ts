// party/server.ts
import type * as Party from 'partykit/server';

// Define types for our game messages
interface GameMessage {
  type: 'move' | 'timeout' | 'resign' | 'opponent_active' | 'player_joined' | 'error' | 'connected';
  game_id?: string;
  board?: (string | null)[];
  currentPlayer?: 'white' | 'black';
  redPieces?: number;
  blackPieces?: number;
  status?: 'open' | 'active' | 'finished' | 'closed';
  winner_id?: string | null;
  player_id?: string;
  last_move_at?: string;
  moveDetails?: {
    from: { row: number; col: number };
    to: { row: number; col: number };
    isJump: boolean;
  };
  message?: string;
}

interface ClientMessage {
  type: 'move' | 'timeout' | 'resign' | 'opponent_active' | 'join_game';
  game_id?: string;
  board?: (string | null)[];
  currentPlayer?: 'white' | 'black';
  redPieces?: number;
  blackPieces?: number;
  status?: 'open' | 'active' | 'finished' | 'closed';
  winner_id?: string | null;
  player_id?: string;
  last_move_at?: string;
  moveDetails?: {
    from: { row: number; col: number };
    to: { row: number; col: number };
    isJump: boolean;
  };
}

// Enhanced Supabase client for server-side operations
const createSupabaseClient = (url: string, key: string) => {
  return {
    from: (table: string) => ({
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            const response = await fetch(
              `${url}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`,
              {
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (!response.ok) {
              throw new Error(`Supabase query failed: ${response.statusText}`);
            }
            
            return response.json();
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: async () => {
            const response = await fetch(
              `${url}/rest/v1/${table}?${column}=eq.${value}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': key,
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
              }
            );
            
            if (!response.ok) {
              throw new Error(`Supabase update failed: ${response.statusText}`);
            }
            
            return response.json();
          }
        })
      })
    }),
    rpc: (fn: string, params: any) => ({
      select: async () => {
        const response = await fetch(
          `${url}/rest/v1/rpc/${fn}`,
          {
            method: 'POST',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
          }
        );
        
        if (!response.ok) {
          throw new Error(`Supabase RPC failed: ${response.statusText}`);
        }
        
        return response.json();
      }
    })
  };
};

export default class CheckersServer implements Party.Server {
  // Store connections by game ID
  private connections: Map<string, Set<Party.Connection>> = new Map();
  private supabase: any;

  constructor(readonly party: Party.Party) {
    // Initialize Supabase client
    this.supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    // Extract game ID from URL query parameters
    const url = new URL(ctx.request.url);
    const gameId = url.searchParams.get('gameId');
    
    if (!gameId) {
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Game ID is required'
      }));
      connection.close();
      return;
    }

    // Store connection by game ID
    if (!this.connections.has(gameId)) {
      this.connections.set(gameId, new Set());
    }
    this.connections.get(gameId)!.add(connection);

    // Send welcome message with game ID
    connection.send(JSON.stringify({
      type: 'connected',
      game_id: gameId
    }));

    console.log(`Client ${connection.id} connected to game ${gameId}`);
  }

  onClose(connection: Party.Connection) {
    // Remove connection from all games
    for (const [gameId, connections] of this.connections.entries()) {
      if (connections.has(connection)) {
        connections.delete(connection);
        
        // If no more connections for this game, clean up
        if (connections.size === 0) {
          this.connections.delete(gameId);
        }
        
        console.log(`Client ${connection.id} disconnected from game ${gameId}`);
        break;
      }
    }
  }

  async onMessage(message: string, connection: Party.Connection) {
    try {
      const data: ClientMessage = JSON.parse(message);
      
      // All messages require a game ID
      if (!data.game_id) {
        connection.send(JSON.stringify({
          type: 'error',
          message: 'Game ID is required'
        }));
        return;
      }

      // Verify the connection is part of this game
      if (!this.connections.has(data.game_id) || 
          !this.connections.get(data.game_id)!.has(connection)) {
        connection.send(JSON.stringify({
          type: 'error',
          message: 'Not connected to this game'
        }));
        return;
      }

      switch (data.type) {
        case 'move':
          await this.handleMove(data, connection);
          break;
          
        case 'timeout':
          await this.handleTimeout(data, connection);
          break;
          
        case 'resign':
          await this.handleResign(data, connection);
          break;
          
        case 'opponent_active':
          await this.handleOpponentActive(data, connection);
          break;
          
        case 'join_game':
          await this.handlePlayerJoined(data, connection);
          break;
          
        default:
          console.warn('Unknown message type:', data.type);
          connection.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  private async handleMove(data: ClientMessage, connection: Party.Connection) {
    try {
      // Validate required fields
      if (!data.board || !data.currentPlayer || data.redPieces === undefined || data.blackPieces === undefined) {
        connection.send(JSON.stringify({
          type: 'error',
          message: 'Invalid move data'
        }));
        return;
      }

      // Update game state in Supabase if needed
      if (data.status === 'finished') {
        try {
          await this.supabase
            .from('games')
            .update({
              board: data.board,
              current_player: data.currentPlayer,
              status: data.status,
              winner_id: data.winner_id,
              last_move_at: data.last_move_at || new Date().toISOString()
            })
            .eq('id', data.game_id)
            .select();
        } catch (error) {
          console.error('Error updating game state:', error);
        }
      }

      // Broadcast move to all clients in the same game
      this.broadcastToGame(data.game_id!, JSON.stringify({
        type: 'move',
        game_id: data.game_id,
        board: data.board,
        currentPlayer: data.currentPlayer,
        redPieces: data.redPieces,
        blackPieces: data.blackPieces,
        status: data.status || 'active',
        winner_id: data.winner_id || null,
        last_move_at: data.last_move_at || new Date().toISOString(),
        player_id: data.player_id,
        moveDetails: data.moveDetails
      }), connection.id);

      console.log(`Move broadcast for game ${data.game_id}`);

    } catch (error) {
      console.error('Error handling move:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process move'
      }));
    }
  }

  private async handleTimeout(data: ClientMessage, connection: Party.Connection) {
    try {
      // Validate required fields
      if (!data.board || !data.currentPlayer || data.redPieces === undefined || data.blackPieces === undefined) {
        connection.send(JSON.stringify({
          type: 'error',
          message: 'Invalid timeout data'
        }));
        return;
      }

      // Update game state in Supabase
      try {
        await this.supabase
          .from('games')
          .update({
            board: data.board,
            current_player: data.currentPlayer,
            last_move_at: data.last_move_at || new Date().toISOString()
          })
          .eq('id', data.game_id)
          .select();
      } catch (error) {
        console.error('Error updating game state:', error);
      }

      // Broadcast timeout to all clients in the same game
      this.broadcastToGame(data.game_id!, JSON.stringify({
        type: 'timeout',
        game_id: data.game_id,
        board: data.board,
        currentPlayer: data.currentPlayer,
        redPieces: data.redPieces,
        blackPieces: data.blackPieces,
        status: data.status || 'active',
        last_move_at: data.last_move_at || new Date().toISOString()
      }), connection.id);

      console.log(`Timeout broadcast for game ${data.game_id}`);

    } catch (error) {
      console.error('Error handling timeout:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process timeout'
      }));
    }
  }

  private async handleResign(data: ClientMessage, connection: Party.Connection) {
    try {
      // Update game state in Supabase
      try {
        await this.supabase
          .from('games')
          .update({
            status: 'finished',
            winner_id: data.winner_id
          })
          .eq('id', data.game_id)
          .select();
      } catch (error) {
        console.error('Error updating game state:', error);
      }

      // Broadcast resignation to all clients in the same game
      this.broadcastToGame(data.game_id!, JSON.stringify({
        type: 'resign',
        game_id: data.game_id,
        status: 'finished',
        winner_id: data.winner_id || null,
        player_id: data.player_id
      }), connection.id);

      console.log(`Resignation broadcast for game ${data.game_id}, winner: ${data.winner_id}`);

    } catch (error) {
      console.error('Error handling resignation:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process resignation'
      }));
    }
  }

  private async handleOpponentActive(data: ClientMessage, connection: Party.Connection) {
    try {
      // Broadcast opponent activity to all other clients in the same game
      this.broadcastToGame(data.game_id!, JSON.stringify({
        type: 'opponent_active',
        game_id: data.game_id,
        player_id: data.player_id
      }), connection.id);

    } catch (error) {
      console.error('Error handling opponent activity:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process opponent activity'
      }));
    }
  }

  private async handlePlayerJoined(data: ClientMessage, connection: Party.Connection) {
    try {
      // Broadcast player joined to all other clients in the same game
      this.broadcastToGame(data.game_id!, JSON.stringify({
        type: 'player_joined',
        game_id: data.game_id,
        player_id: data.player_id
      }), connection.id);

      console.log(`Player ${data.player_id} joined game ${data.game_id}`);

    } catch (error) {
      console.error('Error handling player joined:', error);
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process player joined'
      }));
    }
  }

  // Helper method to broadcast to all connections in a game except the sender
  private broadcastToGame(gameId: string, message: string, senderId?: string) {
    const connections = this.connections.get(gameId);
    if (connections) {
      connections.forEach(conn => {
        if (!senderId || conn.id !== senderId) {
          try {
            conn.send(message);
          } catch (error) {
            console.error('Error sending message to connection:', error);
            // Remove broken connection
            connections.delete(conn);
          }
        }
      });
    }
  }

  async onRequest(request: Party.Request) {
    // Handle HTTP requests to this party
    const url = new URL(request.url);
    const gameId = url.searchParams.get('gameId');

    if (request.method === 'GET' && gameId) {
      try {
        // Fetch game state from Supabase
        const { data, error } = await this.supabase
          .from('games')
          .select('id, board, current_player, status, winner_id, last_move_at, player1_id, player2_id, stake, created_at')
          .eq('id', gameId)
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Calculate piece counts
        const redPieces = data.board.filter((p: string | null) => p === 'wp' || p === 'wk').length;
        const blackPieces = data.board.filter((p: string | null) => p === 'bp' || p === 'bk').length;

        return new Response(JSON.stringify({
          id: data.id,
          board: data.board,
          current_player: data.current_player,
          redPieces,
          blackPieces,
          status: data.status,
          winner_id: data.winner_id,
          last_move_at: data.last_move_at,
          player1_id: data.player1_id,
          player2_id: data.player2_id,
          stake: data.stake,
          created_at: data.created_at
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch game state' }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Handle OPTIONS for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    return new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Add types for environment variables
declare global {
  interface PartyEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  }
}