import { useStorage } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, Clock, User as UserIcon } from 'lucide-react';
import { formatPHTDateTime } from '../lib/phtDate';

export default function AuditLogs() {
  const { auditLogs } = useStorage();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Audit Log</h2>
        <p className="text-zinc-300">Track all system activities and changes.</p>
      </div>

      <Card className="bg-card border-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.05)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-auto pr-2">
            {auditLogs.length > 0 ? (
              auditLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((log) => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background/50 border border-primary/10 rounded-xl hover:border-primary/30 transition-colors gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          {log.action}
                        </span>
                        <span className="text-sm font-medium text-white">{log.details}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatPHTDateTime(log.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {log.user}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-10 text-zinc-500">
                <p>No activity logs found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}