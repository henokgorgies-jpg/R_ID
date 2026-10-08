'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  IdCard,
  Loader2,
  LockKeyhole,
  Mail,
  MapPinned,
  ScanSearch,
  ShieldCheck,
  Users,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'admin@registry.gov.et', password: 'admin123', role: 'Super Admin' },
  { email: 'bole.admin@registry.gov.et', password: 'zone123', role: 'Zone Admin' },
  { email: 'woreda1.bole@registry.gov.et', password: 'woreda123', role: 'Woreda Admin' },
  { email: 'kebele01.bole1@registry.gov.et', password: 'kebele123', role: 'Kebele Admin' },
  { email: 'auditor@registry.gov.et', password: 'audit123', role: 'Auditor' },
  { email: 'verify@registry.gov.et', password: 'verify123', role: 'Verification Officer' },
];

const ENABLE_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === 'true';

const CAPABILITIES = [
  { title: 'Resident Registration', icon: Users },
  { title: 'Identity Card Issuance', icon: IdCard },
  { title: 'Duplicate Investigation', icon: ScanSearch },
  { title: 'Approval Operations', icon: ClipboardCheck },
  { title: 'Administrative Scope', icon: MapPinned },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setIsLoading(true);

    const result = await login(demoEmail, demoPassword);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f4f8ff_0%,#edf5ef_46%,#fdf7ea_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="pointer-events-none absolute inset-0">
        <div className="blob blob-a absolute -left-20 top-0 h-72 w-72 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="blob blob-b absolute right-[-70px] top-20 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="blob blob-c absolute bottom-[-100px] left-1/3 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
      </div>

      <main className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="space-y-6 reveal">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-none border border-slate-300 bg-white/90 text-slate-700">
              Federal Democratic Republic of Ethiopia
            </Badge>
            <Badge variant="outline" className="rounded-none border-emerald-700/40 bg-emerald-50/80 text-emerald-900">
              National Identity Authority
            </Badge>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Kebele Civil Registry Platform
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
              Secure operations console for resident lifecycle, card issuance, and duplicate verification.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="reveal rounded-none border border-slate-300/75 bg-white/85 p-3 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${idx * 90}ms` }}
                >
                  <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-none border border-emerald-700/25 bg-emerald-50">
                    <Icon className="h-4 w-4 text-emerald-700" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                </article>
              );
            })}
          </div>
        </section>

        <section className="flex items-center justify-center lg:min-h-[700px]">
          <Card className="reveal w-full max-w-md rounded-none border-slate-300/80 bg-white/95 shadow-[0_20px_65px_-26px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <CardHeader className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-none border border-emerald-700/25 bg-emerald-50">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Secure Sign In</CardTitle>
                <p className="mt-1 text-sm text-slate-600">Use your government-issued account credentials.</p>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Government Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@registry.gov.et"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-none pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-none pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={isLoading}
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-none border border-transparent text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="h-11 w-full rounded-none" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {ENABLE_DEMO_ACCOUNTS && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demo Accounts</div>
                  <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                    {DEMO_ACCOUNTS.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => handleDemoLogin(account.email, account.password)}
                        disabled={isLoading}
                        className="w-full rounded-none border border-slate-300 bg-slate-50/90 p-3 text-left transition hover:bg-slate-100 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{account.role}</p>
                            <p className="text-xs text-slate-600">{account.email}</p>
                          </div>
                          <span className="rounded-none border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600">
                            {account.password}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <style jsx global>{`
        @keyframes floatY {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-16px);
          }
        }

        @keyframes revealUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .blob-a {
          animation: floatY 7s ease-in-out infinite;
        }

        .blob-b {
          animation: floatY 9s ease-in-out infinite;
          animation-delay: 1.2s;
        }

        .blob-c {
          animation: floatY 8s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        .reveal {
          animation: revealUp 560ms ease-out both;
        }
      `}</style>
    </div>
  );
}
