import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStorage } from '../lib/storage';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { calculateLoanDetails } from '../lib/calculations';
import { getPhilippineYMD } from '../lib/phtDate';
import { LoanType, LoanGroup, PaymentFrequency } from '../types';
import { ChevronLeft, Save, Calculator } from 'lucide-react';

const loanSchema = z.object({
  borrowerName: z.string().min(2, 'Name is too short'),
  principal: z.number().min(1, 'Principal must be positive'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  frequency: z.enum(['Weekly', 'Biweekly', 'Monthly']),
  durationMonths: z.number().min(1).max(120),
  loanType: z.enum(['New', 'Reloan']),
  loanGroup: z.enum(['1st', '2nd']),
  startDate: z.string(),
  latePenaltyRate: z.number().min(0),
  latePenaltyGrace: z.number().min(0),
  notes: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

export default function LoanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loans, addLoan, updateLoan } = useStorage();
  
  const existingLoan = id ? loans.find(l => l.id === id) : null;

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      borrowerName: '',
      principal: 1000,
      interestRate: 5,
      frequency: 'Weekly',
      durationMonths: 2,
      loanType: 'New',
      loanGroup: '1st',
      startDate: getPhilippineYMD(),
      latePenaltyRate: 2,
      latePenaltyGrace: 3,
      notes: '',
    },
  });

  useEffect(() => {
    if (existingLoan) {
      form.reset({
        borrowerName: existingLoan.borrowerName,
        principal: existingLoan.principal,
        interestRate: existingLoan.interestRate,
        frequency: existingLoan.frequency,
        durationMonths: existingLoan.durationMonths || 2,
        loanType: existingLoan.loanType,
        loanGroup: existingLoan.loanGroup,
        startDate: getPhilippineYMD(existingLoan.startDate),
        latePenaltyRate: existingLoan.latePenalty.rate,
        latePenaltyGrace: existingLoan.latePenalty.gracePeriod,
        notes: existingLoan.notes || '',
      });
    }
  }, [existingLoan, form]);

  const onSubmit = async (values: LoanFormValues) => {
    const { totalInterest, totalAmount, installmentAmount, installments } = calculateLoanDetails(
      values.principal,
      values.interestRate,
      values.durationMonths,
      values.frequency
    );

    const loanData = {
      borrowerName: values.borrowerName,
      principal: values.principal,
      interestRate: values.interestRate,
      durationMonths: values.durationMonths,
      frequency: values.frequency,
      installments,
      loanType: values.loanType,
      loanGroup: values.loanGroup,
      startDate: new Date(values.startDate).toISOString(),
      latePenalty: {
        rate: values.latePenaltyRate,
        gracePeriod: values.latePenaltyGrace,
      },
      notes: values.notes || '',
      status: existingLoan ? existingLoan.status : 'Unpaid' as const,
      totalAmount,
      totalInterest,
      installmentAmount,
    };

    try {
      if (id) {
        await updateLoan(id, loanData);
        toast.success('Loan updated successfully');
      } else {
        await addLoan(loanData);
        toast.success('Loan added successfully');
      }
      navigate('/loans');
    } catch (error) {
      toast.error('Failed to save loan');
      console.error(error);
    }
  };

  const principal = form.watch('principal');
  const interestRate = form.watch('interestRate');
  const durationMonths = form.watch('durationMonths');
  const frequency = form.watch('frequency');

  const preview = calculateLoanDetails(principal || 0, interestRate || 0, durationMonths || 0, frequency);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-zinc-300 hover:text-primary hover:bg-primary/5">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white neon-text">{id ? 'Edit Loan' : 'Add New Loan'}</h2>
          <p className="text-zinc-300">Configure loan terms and borrower details.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.05)]">
            <CardHeader>
              <CardTitle className="text-white">Borrower Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="borrowerName" className="text-zinc-300">Borrower Name</Label>
                <Input 
                  id="borrowerName" 
                  {...form.register('borrowerName')} 
                  className="bg-background border-primary/10 text-white focus:border-primary/50 transition-all"
                  placeholder="Full Name"
                />
                {form.formState.errors.borrowerName && <p className="text-xs text-destructive">{form.formState.errors.borrowerName.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Loan Type</Label>
                  <Select 
                    value={form.watch('loanType')} 
                    onValueChange={(val) => form.setValue('loanType', val as LoanType)}
                  >
                    <SelectTrigger className="bg-background border-primary/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/10 text-white">
                      <SelectItem value="New">New Loan</SelectItem>
                      <SelectItem value="Reloan">Reloan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Loan Group</Label>
                  <Select 
                    value={form.watch('loanGroup')} 
                    onValueChange={(val) => form.setValue('loanGroup', val as LoanGroup)}
                  >
                    <SelectTrigger className="bg-background border-primary/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/10 text-white">
                      <SelectItem value="1st">1st Group</SelectItem>
                      <SelectItem value="2nd">2nd Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.05)]">
            <CardHeader>
              <CardTitle className="text-white">Loan Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="principal" className="text-zinc-300">Principal (₱)</Label>
                  <Input 
                    id="principal" 
                    type="number"
                    {...form.register('principal', { valueAsNumber: true })} 
                    className="bg-background border-primary/10 text-white focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate" className="text-zinc-300">Monthly Interest (%)</Label>
                  <Input 
                    id="interestRate" 
                    type="number"
                    {...form.register('interestRate', { valueAsNumber: true })} 
                    className="bg-background border-primary/10 text-white focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Payment Frequency</Label>
                  <Select 
                    value={form.watch('frequency')} 
                    onValueChange={(val) => form.setValue('frequency', val as PaymentFrequency)}
                  >
                    <SelectTrigger className="bg-background border-primary/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/10 text-white">
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Biweekly">Biweekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMonths" className="text-zinc-300">Duration (Months)</Label>
                  <Input 
                    id="durationMonths" 
                    type="number"
                    {...form.register('durationMonths', { valueAsNumber: true })} 
                    className="bg-background border-primary/10 text-white focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-zinc-300">Start Date</Label>
                <Input 
                  id="startDate" 
                  type="date"
                  {...form.register('startDate')} 
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.05)]">
            <CardHeader>
              <CardTitle className="text-white">Late Penalties</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latePenaltyRate" className="text-zinc-300">Penalty Rate (%)</Label>
                <Input 
                  id="latePenaltyRate" 
                  type="number"
                  {...form.register('latePenaltyRate', { valueAsNumber: true })} 
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latePenaltyGrace" className="text-zinc-300">Grace Period (Days)</Label>
                <Input 
                  id="latePenaltyGrace" 
                  type="number"
                  {...form.register('latePenaltyGrace', { valueAsNumber: true })} 
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-secondary/10 shadow-[0_0_20px_rgba(var(--secondary),0.05)] sticky top-8 overflow-hidden">
            <div className="h-1 bg-secondary shadow-[0_0_10px_rgba(var(--secondary),0.5)]"></div>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-secondary" />
                Calculation Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-zinc-300 uppercase font-bold">Total Interest</p>
                <p className="text-xl font-bold text-white">₱{preview.totalInterest.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-zinc-300 uppercase font-bold">Total Amount</p>
                <p className="text-xl font-bold text-secondary neon-text">₱{preview.totalAmount.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-zinc-300 uppercase font-bold">Installment Amount ({preview.installments} payments)</p>
                <p className="text-xl font-bold text-accent neon-text">₱{preview.installmentAmount.toLocaleString()}</p>
              </div>

              <div className="pt-6 border-t border-primary/10">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-12 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                  <Save className="h-5 w-5 mr-2" />
                  {id ? 'Update Loan' : 'Save Loan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
