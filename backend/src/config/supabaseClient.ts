import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js';
import ws from 'ws';
import { env } from './env.js';

/**
 * Service-role client. Bypasses RLS entirely — this process IS the trusted
 * server-side layer. Every query below must therefore scope by
 * organization_id explicitly; the database will not do it for us here.
 *
 * Singleton on purpose: the client holds a connection-reusing fetch agent,
 * and constructing one per request leaks sockets under load.
 */
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // No user session to persist or refresh — this is a machine client.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'x-application-name': 'leadpulse-backend' },
    },
    // createClient eagerly builds a RealtimeClient even though this app
    // never subscribes to anything, and that constructor needs a global
    // WebSocket. Node 22+ has one; Node 20 does not, so without this the
    // process throws at import time. Supplying `ws` keeps the app running
    // on both. Drop it once the deploy target is pinned to Node 22+.
    // The cast is unavoidable: ws's constructor signature is wider than
    // supabase's WebSocketLikeConstructor. It is structurally compatible at
    // runtime — realtime-js only ever calls `new transport(url, protocols)`.
    realtime: { transport: ws } as unknown as SupabaseClientOptions<'public'>['realtime'],
  },
);
