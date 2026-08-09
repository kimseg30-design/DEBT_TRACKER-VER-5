import React, { useState } from 'react';
import { useStorage } from '../lib/storage';
import { getPhilippineYMD, formatPHTDate } from '../lib/phtDate';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Users, Plus, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';

export default function Members() {
  const { members, addMember, updateMember, deleteMember } = useStorage();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [baseContribution, setBaseContribution] = useState('50');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Name is required');
      return;
    }

    try {
      const parsedBaseContribution = parseFloat(baseContribution) >= 0 ? parseFloat(baseContribution) : 50;
      if (editingId) {
        await updateMember(editingId, { 
          name, 
          contact, 
          status, 
          baseContribution: parsedBaseContribution 
        });
        toast.success('Member updated');
      } else {
        await addMember({
          name,
          contact,
          status,
          joinDate: getPhilippineYMD(),
          baseContribution: parsedBaseContribution,
        });
        toast.success('Member added');
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save member');
    }
  };

  const resetForm = () => {
    setName('');
    setContact('');
    setStatus('Active');
    setBaseContribution('50');
    setEditingId(null);
  };

  const handleEdit = (member: any) => {
    setName(member.name);
    setContact(member.contact || '');
    setStatus(member.status);
    setBaseContribution(member.baseContribution !== undefined ? member.baseContribution.toString() : '50');
    setEditingId(member.id);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteMember(id);
    toast.success('Member deleted');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Members</h2>
          <p className="text-zinc-300">Manage your members and their profiles.</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]" />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </DialogTrigger>
          <DialogContent className="bg-card border-primary/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold neon-text">
                {editingId ? 'Edit Member' : 'Add New Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact" className="text-zinc-300">Contact Info</Label>
                <Input 
                  id="contact" 
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                  placeholder="Phone or Email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseContribution" className="text-zinc-300">Base Weekly Contribution (₱)</Label>
                <Input 
                  id="baseContribution" 
                  type="number"
                  min="0"
                  value={baseContribution}
                  onChange={(e) => setBaseContribution(e.target.value)}
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Status</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant={status === 'Active' ? 'default' : 'outline'}
                    onClick={() => setStatus('Active')}
                    className={status === 'Active' ? 'bg-primary text-primary-foreground' : 'text-zinc-300 border-primary/10'}
                  >
                    Active
                  </Button>
                  <Button 
                    type="button"
                    variant={status === 'Inactive' ? 'default' : 'outline'}
                    onClick={() => setStatus('Inactive')}
                    className={status === 'Inactive' ? 'bg-secondary text-secondary-foreground' : 'text-zinc-300 border-primary/10'}
                  >
                    Inactive
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground mt-4">
                {editingId ? 'Update Member' : 'Save Member'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.length > 0 ? (
          members.map((member) => (
            <Card key={member.id} className="bg-card border-primary/10 hover:border-primary/30 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">{member.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1">{member.contact || 'No contact info'}</p>
                    <p className="text-sm text-amber-400 font-medium mt-1">
                      Base Contribution: ₱{member.baseContribution !== undefined ? member.baseContribution.toLocaleString() : '50'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">Joined: {formatPHTDate(member.joinDate)}</p>
                  </div>
                  <Badge variant="outline" className={member.status === 'Active' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-muted text-muted-foreground'}>
                    {member.status}
                  </Badge>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-primary/10">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-primary hover:bg-primary/10" onClick={() => handleEdit(member)}>
                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(member.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-card border border-primary/10 rounded-2xl text-zinc-300">
            <Users className="h-12 w-12 mb-4 text-primary opacity-20" />
            <p className="text-lg font-medium text-white">No members found</p>
            <p className="text-sm">Add your first member to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}