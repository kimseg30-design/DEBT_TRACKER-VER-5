import { useState, useEffect, useMemo } from 'react';
import { useStorage } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Wallet, Plus, Trash2, CheckCircle2, Clock, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { getPhilippineYMD, getPhilippineDateParts, formatPHTDate } from '../lib/phtDate';

export default function Contributions() {
  const { members, contributions, addContribution, updateContribution, deleteContribution } = useStorage();
  const [date, setDate] = useState(getPhilippineYMD());
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  
  const activeMembers = useMemo(() => members.filter(m => m.status === 'Active'), [members]);

  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [memberAmounts, setMemberAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeMembers.length > 0) {
      setSelectedMembers(prev => {
        const newSelected = { ...prev };
        activeMembers.forEach(m => {
          if (newSelected[m.id] === undefined) {
            newSelected[m.id] = true;
          }
        });
        return newSelected;
      });
      setMemberAmounts(prev => {
        const newAmounts = { ...prev };
        activeMembers.forEach(m => {
          if (newAmounts[m.id] === undefined) {
            newAmounts[m.id] = m.baseContribution !== undefined ? m.baseContribution.toString() : '50';
          }
        });
        return newAmounts;
      });
    }
  }, [activeMembers]);

  const handleGenerateContributions = async () => {
    const membersToGenerate = activeMembers.filter(m => selectedMembers[m.id]);

    if (membersToGenerate.length === 0) {
      toast.error('No members selected');
      return;
    }

    for (const member of membersToGenerate) {
      const amount = memberAmounts[member.id];
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        toast.error(`Please enter a valid amount for ${member.name}`);
        return;
      }
    }

    try {
      for (const member of membersToGenerate) {
        await addContribution({
          memberId: member.id,
          amount: Number(memberAmounts[member.id]),
          date: new Date(date).toISOString(),
          notes: 'Weekly Contribution',
          isVerified: false
        });
      }
      toast.success(`Successfully generated contributions for ${membersToGenerate.length} members`);
    } catch (error) {
      toast.error('Failed to generate some contributions');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteContribution(id);
    toast.success('Contribution deleted');
  };

  const handleToggleVerify = async (id: string, currentStatus?: boolean) => {
    await updateContribution(id, { isVerified: !currentStatus });
    toast.success(`Contribution marked as ${!currentStatus ? 'verified' : 'pending'}`);
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAmountChange = (id: string, value: string) => {
    setMemberAmounts(prev => ({ ...prev, [id]: value }));
  };

  // Count how many distinct weeks each member has contributed to
  const memberWeekCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const memberWeeksSet: Record<string, Set<string>> = {};
    
    contributions.forEach(c => {
      if (!memberWeeksSet[c.memberId]) {
        memberWeeksSet[c.memberId] = new Set();
      }
      const { year, month, day } = getPhilippineDateParts(c.date);
      const pstMidnight = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = pstMidnight.getUTCDay();
      const sunday = new Date(pstMidnight.getTime() - dayOfWeek * 86400000);
      const weekKey = sunday.toISOString().split('T')[0];
      memberWeeksSet[c.memberId].add(weekKey);
    });

    Object.keys(memberWeeksSet).forEach(memberId => {
      map[memberId] = memberWeeksSet[memberId].size;
    });

    return map;
  }, [contributions]);

  // Group contributions by calendar week
  const groupedWeeks = useMemo(() => {
    const groups: Record<string, typeof contributions> = {};
    
    contributions.forEach(c => {
      // Find the start of the week (Sunday) for this contribution date in PST
      const { year, month, day } = getPhilippineDateParts(c.date);
      const pstMidnight = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = pstMidnight.getUTCDay();
      const sunday = new Date(pstMidnight.getTime() - dayOfWeek * 86400000);
      const weekKey = sunday.toISOString().split('T')[0];
      
      if (!groups[weekKey]) {
        groups[weekKey] = [];
      }
      groups[weekKey].push(c);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const totalWeeks = sortedKeys.length;

    return sortedKeys.map((weekKey, index) => {
      const list = groups[weekKey];
      const label = `Week of ${formatPHTDate(weekKey)}`;
      const weekNumber = totalWeeks - index; // Chronological week number
      
      // Calculate validations & metrics
      const totalExpected = list.reduce((sum, c) => sum + c.amount, 0);
      const totalVerified = list.filter(c => c.isVerified).reduce((sum, c) => sum + c.amount, 0);
      const verifiedCount = list.filter(c => c.isVerified).length;
      const totalCount = list.length;
      const isFullyVerified = verifiedCount === totalCount;
      const percentVerified = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;

      return {
        weekKey,
        label,
        weekNumber,
        totalWeeks,
        contributions: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        totalExpected,
        totalVerified,
        verifiedCount,
        totalCount,
        isFullyVerified,
        percentVerified
      };
    });
  }, [contributions]);

  // Expand the first week by default when loaded
  useEffect(() => {
    if (groupedWeeks.length > 0) {
      setExpandedWeeks(prev => {
        if (Object.keys(prev).length === 0) {
          return { [groupedWeeks[0].weekKey]: true };
        }
        return prev;
      });
    }
  }, [groupedWeeks]);

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  const totalContributionsAmount = useMemo(() => {
    return contributions.reduce((sum, c) => sum + c.amount, 0);
  }, [contributions]);

  const totalVerifiedAmount = useMemo(() => {
    return contributions.filter(c => c.isVerified).reduce((sum, c) => sum + c.amount, 0);
  }, [contributions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Contributions</h2>
          <p className="text-zinc-300">Manage weekly contributions and verify checklists for all members.</p>
        </div>
        
        {/* Quick Stats Header Summary */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-card/80 border border-primary/20 rounded-xl flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-xs text-zinc-400">Total Weeks:</span>
            <span className="text-xs font-bold text-white font-mono">{groupedWeeks.length} {groupedWeeks.length === 1 ? 'Week' : 'Weeks'}</span>
          </div>
          <div className="px-3 py-1.5 bg-card/80 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-zinc-400">Total Capital:</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">₱{totalContributionsAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card border-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.05)] lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Generate Contributions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-zinc-300">Date</Label>
              <Input 
                id="date" 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-background border-primary/10 text-white focus:border-primary/50"
              />
            </div>
            
            <div className="space-y-2 pt-2">
              <Label className="text-zinc-300">Active Members</Label>
              <div className="space-y-3 max-h-[300px] overflow-auto pr-2">
                {activeMembers.length > 0 ? (
                  activeMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between gap-2 p-2 bg-background/50 rounded-lg border border-primary/5">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id={`member-${member.id}`} 
                          checked={selectedMembers[member.id] || false}
                          onCheckedChange={() => toggleMember(member.id)}
                        />
                        <div className="flex flex-col">
                          <Label htmlFor={`member-${member.id}`} className="text-sm cursor-pointer text-white">
                            {member.name}
                          </Label>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <span>Base: ₱{member.baseContribution !== undefined ? member.baseContribution.toLocaleString() : '50'}</span>
                            <span>•</span>
                            <span className="text-primary font-medium">{memberWeekCounts[member.id] || 0} {(memberWeekCounts[member.id] || 0) === 1 ? 'week' : 'weeks'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-20">
                        <Input 
                          type="number"
                          value={memberAmounts[member.id] || ''}
                          onChange={(e) => handleAmountChange(member.id, e.target.value)}
                          disabled={!selectedMembers[member.id]}
                          className="h-8 text-sm bg-background border-primary/10 text-white focus:border-primary/50 px-2"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No active members found.</p>
                )}
              </div>
            </div>

            <Button 
              onClick={handleGenerateContributions}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)] mt-4"
              disabled={activeMembers.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Selected
            </Button>
            <p className="text-xs text-zinc-500 text-center mt-2">
              Will apply to {activeMembers.filter(m => selectedMembers[m.id]).length} members
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.05)] lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle className="text-white">Weekly Contribution Checklists</CardTitle>
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-bold text-xs py-0.5 px-2.5">
                {groupedWeeks.length} {groupedWeeks.length === 1 ? 'Week' : 'Weeks'}
              </Badge>
            </div>
            {groupedWeeks.length > 0 && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8 bg-background border-primary/10 text-zinc-300 hover:text-white"
                  onClick={() => {
                    const allExpanded: Record<string, boolean> = {};
                    groupedWeeks.forEach(w => { allExpanded[w.weekKey] = true; });
                    setExpandedWeeks(allExpanded);
                  }}
                >
                  Expand All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8 bg-background border-primary/10 text-zinc-300 hover:text-white"
                  onClick={() => setExpandedWeeks({})}
                >
                  Collapse All
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-auto pr-2">
              {groupedWeeks.length > 0 ? (
                groupedWeeks.map((week) => {
                  const isExpanded = !!expandedWeeks[week.weekKey];
                  return (
                    <div key={week.weekKey} className="space-y-2 border border-primary/5 rounded-xl bg-background/30 p-1">
                      {/* Week Accordion Header */}
                      <div 
                        onClick={() => toggleWeek(week.weekKey)}
                        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer rounded-lg hover:bg-primary/5 transition-all duration-300 select-none ${isExpanded ? 'bg-primary/5 border border-primary/15' : ''}`}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold px-2 py-0.5">
                              Week {week.weekNumber} of {groupedWeeks.length}
                            </Badge>
                            <h4 className="font-bold text-white tracking-tight">{week.label}</h4>
                            <Badge variant="outline" className={`text-[10px] font-bold ${week.isFullyVerified ? 'bg-accent/10 text-accent border-accent/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}>
                              {week.isFullyVerified ? '✓ Fully Verified' : '⚠️ Pending Verification'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                            <span>Verified: <span className="text-emerald-400 font-bold">₱{week.totalVerified.toLocaleString()}</span></span>
                            <span>Total Expected: <span className="text-white font-medium">₱{week.totalExpected.toLocaleString()}</span></span>
                            <span>Progress: <span className="text-primary font-bold">{week.verifiedCount}/{week.totalCount} ({Math.round(week.percentVerified)}%)</span></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-zinc-800/40 pt-2 md:pt-0">
                          {/* Mini progress bar inside header */}
                          <div className="w-24 bg-zinc-900 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full transition-all duration-500 ${week.isFullyVerified ? 'bg-accent' : 'bg-primary'}`}
                              style={{ width: `${week.percentVerified}%` }}
                            />
                          </div>
                          <div className="p-1 text-zinc-400">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-primary" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Week Contributions checklist */}
                      {isExpanded && (
                        <div className="p-3 space-y-3 bg-zinc-950/40 rounded-b-lg border-t border-primary/10 animate-in slide-in-from-top-2 duration-200">
                          {/* Validation summary banner */}
                          <div className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium ${week.isFullyVerified ? 'bg-accent/5 border-accent/15 text-accent' : 'bg-yellow-500/5 border-yellow-500/15 text-yellow-500'}`}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>
                                {week.isFullyVerified 
                                  ? `Week ${week.weekNumber} Checklist Complete: All weekly contributions have been audited and verified successfully.` 
                                  : `Week ${week.weekNumber} Checklist Pending: ${week.totalCount - week.verifiedCount} contribution(s) require verification.`}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] bg-background/50 px-2.5 py-0.5 rounded border border-current/25">
                              {Math.round(week.percentVerified)}% Validated
                            </span>
                          </div>

                          {/* Member List Checklist */}
                          <div className="space-y-2">
                            {week.contributions.map((contribution) => {
                              const member = members.find(m => m.id === contribution.memberId);
                              const memberWeeks = memberWeekCounts[contribution.memberId] || 1;
                              return (
                                <div 
                                  key={contribution.id} 
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-background/50 border rounded-xl hover:border-primary/20 transition-all duration-300 ${contribution.isVerified ? 'border-accent/15 hover:border-accent/30 bg-accent/[0.01]' : 'border-primary/5'}`}
                                >
                                  <div className="flex items-center gap-3 sm:gap-4">
                                    {/* Checklist Checkbox toggle */}
                                    <div className="flex items-center shrink-0">
                                      <Checkbox 
                                        id={`verify-contrib-${contribution.id}`} 
                                        checked={contribution.isVerified || false}
                                        onCheckedChange={() => handleToggleVerify(contribution.id, contribution.isVerified)}
                                        className="h-5 w-5 border-primary/30 text-accent focus:ring-accent data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                                      />
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <label 
                                          htmlFor={`verify-contrib-${contribution.id}`}
                                          className={`font-bold text-sm cursor-pointer transition-colors truncate ${contribution.isVerified ? 'text-zinc-400 line-through decoration-zinc-500/40' : 'text-white'}`}
                                        >
                                          {member?.name || 'Unknown Member'}
                                        </label>
                                        
                                        {/* Number of weeks contributed badge */}
                                        <Badge variant="outline" className="text-[10px] px-2 py-0 bg-zinc-800/90 text-zinc-300 border-zinc-700 font-mono">
                                          {memberWeeks} {memberWeeks === 1 ? 'week' : 'weeks'}
                                        </Badge>

                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition-colors ${contribution.isVerified ? 'bg-accent/10 text-accent border-accent/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                                          {contribution.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-zinc-400 mt-0.5">
                                        {formatPHTDate(contribution.date)} • {contribution.notes}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0 border-t sm:border-t-0 border-zinc-800/40 pt-2 sm:pt-0">
                                    <p className={`text-base font-bold transition-colors ${contribution.isVerified ? 'text-accent' : 'text-primary'}`}>
                                      ₱{contribution.amount.toLocaleString()}
                                    </p>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="text-zinc-500 hover:text-destructive hover:bg-destructive/10 h-8 w-8" 
                                      onClick={() => handleDelete(contribution.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-zinc-500">
                  <p>No contributions recorded yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
