import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

// shadcn components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Lucide icons
import {
  Bot,
  Zap,
  Shuffle,
  BarChart3,
  Paperclip,
  History,
  CheckCircle2,

  Menu,
  X,
  GitBranch,
  MessageCircle,
  Send,
  Camera,
  Mail,
  Wifi,
  Clock,
  Users,
  TrendingUp,
} from 'lucide-react';

import logo from '../assets/logo.svg';
import dashboardMockup from '../assets/dashboard-mockup.jpg';
import { cn } from '@/lib/utils';

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

// ─── Intersection Observer ────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Bot,
    title: 'Chatbot de Triagem Automática',
    description: 'Recebe o cliente, apresenta o menu de setores e direciona o chamado para a fila correta sem intervenção humana.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Zap,
    title: 'Painel Multiatendente em Tempo Real',
    description: 'Operadores visualizam filas setoriais atualizadas instantaneamente via WebSockets e capturam chamados com um clique.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Shuffle,
    title: 'Transferência Avançada',
    description: 'Transfira chamados para a fila geral de outro setor ou diretamente para um colaborador específico que esteja online.',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
  {
    icon: BarChart3,
    title: 'SLA Dinâmico por Setor',
    description: 'Monitore o tempo de espera e configure o encerramento automático por inatividade individualmente para cada setor.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    icon: Paperclip,
    title: 'Envio de Mídias Integrado',
    description: 'Troque imagens, PDFs, documentos e áudios com armazenamento seguro no MinIO / AWS S3.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    icon: History,
    title: 'Histórico Completo de Conversas',
    description: 'Auditoria paginada com filtros por período, atendente, status e cliente. Releia toda a conversa com botão de retorno.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
] as const;

// ─── Steps data ───────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: MessageCircle,
    title: 'Cliente envia mensagem no WhatsApp',
    description: 'A Evolution API captura o evento e dispara um webhook para o Ticket Service em milissegundos.',
  },
  {
    icon: Bot,
    title: 'Chatbot apresenta o menu de setores',
    description: 'A máquina de estados coleta a escolha do cliente e cria o chamado na fila do setor correspondente.',
  },
  {
    icon: Users,
    title: 'Operador captura e inicia o atendimento',
    description: 'O painel atualiza em tempo real via WebSocket. O operador clica em "Capturar" e a conversa começa.',
  },
  {
    icon: CheckCircle2,
    title: 'Resolução ou encerramento automático',
    description: 'O operador resolve ou transfere. O sistema fecha automaticamente por inatividade após o tempo configurado.',
  },
];

// ─── Integrations data ────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { icon: MessageCircle, label: 'WhatsApp',              active: true,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Send,          label: 'Telegram',              active: false, color: 'text-sky-600',     bg: 'bg-sky-50' },
  { icon: Camera,        label: 'Instagram',             active: false, color: 'text-pink-600',    bg: 'bg-pink-50' },
  { icon: Mail,          label: 'E-mail',               active: true,  color: 'text-violet-600',  bg: 'bg-violet-50' },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  value,
  suffix,
  label,
  startCount,
}: {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  startCount: boolean;
}) {
  const count = useCountUp(value, 1800, startCount);
  return (
    <div className="flex flex-col items-center gap-2 px-10 py-8 md:border-r border-white/10 last:border-r-0">
      <Icon className="h-6 w-6 text-emerald-400 mb-1" />
      <span className="text-4xl font-extrabold text-white tracking-tight">
        {count}{suffix}
      </span>
      <span className="text-xs font-medium text-white/50 uppercase tracking-widest text-center">
        {label}
      </span>
    </div>
  );
}

// ─── Feature Card Component ─────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  bg,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  delay: number;
}) {
  const { ref, inView } = useInView();
  return (
    <Card
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      )}
    >
      <CardHeader className="pb-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', bg)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <CardTitle className="text-base text-[#001638]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

// ─── Step Card Component ──────────────────────────────────────────────────────
function StepCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 100}ms` }}
      className={cn(
        'flex gap-4 transition-all duration-500',
        inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
      )}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#001638] text-white flex items-center justify-center font-bold text-sm">
        {index + 1}
      </div>
      <Card className="flex-1 border-slate-200 shadow-none">
        <CardHeader className="pb-1 pt-3 px-4">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-sky-600" />
            <CardTitle className="text-sm text-[#001638]">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-slate-900">

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#hero"
            className="flex items-center gap-2"
            onClick={e => { e.preventDefault(); scrollTo('hero'); }}
          >
            <img src={logo} alt="Setoriza" className="h-8 w-auto" />
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Navegação">
            <button onClick={() => scrollTo('features')} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              Funcionalidades
            </button>
            <button onClick={() => scrollTo('how-it-works')} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              Como Funciona
            </button>
            <button onClick={() => scrollTo('integrations')} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              Integrações
            </button>
            <Separator orientation="vertical" className="h-5" />
            <Button asChild size="sm" id="nav-login-btn" className="bg-[#001638] hover:bg-[#002050]">
              <Link to="/login">
                Login
              </Link>
            </Button>
          </nav>

          {/* Mobile toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4">
            <button onClick={() => scrollTo('features')} className="text-sm font-medium text-slate-700 text-left">Funcionalidades</button>
            <button onClick={() => scrollTo('how-it-works')} className="text-sm font-medium text-slate-700 text-left">Como Funciona</button>
            <button onClick={() => scrollTo('integrations')} className="text-sm font-medium text-slate-700 text-left">Integrações</button>
            <Button asChild className="w-full bg-[#001638] hover:bg-[#002050]">
              <Link to="/login" id="mobile-login-btn" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        id="hero"
        aria-labelledby="hero-heading"
        className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-sky-50 py-24 px-6"
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <Badge
              className="mb-5 gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              variant="outline"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Atendimento em tempo real via WhatsApp
            </Badge>

            <h1
              id="hero-heading"
              className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#001638] mb-5"
            >
              Gerencie todos os seus{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
                atendimentos em um só lugar
              </span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-lg">
              O Setoriza centraliza, tria automaticamente e direciona os chamados do seu WhatsApp para os setores corretos — com chatbot inteligente, filas em tempo real e painel multiatendente.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                id="hero-cta-btn"
                className="bg-[#001638] hover:bg-[#002050] shadow-lg shadow-slate-900/20"
              >
                <Link to="/login">
                  Começar agora
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                id="hero-see-how-btn"
                onClick={() => scrollTo('how-it-works')}
              >
                Ver como funciona
              </Button>
            </div>
          </div>

          {/* Right – Dashboard screenshot */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-sky-400/20 blur-2xl scale-105" />
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-900/15">
              <img
                src={dashboardMockup}
                alt="Painel de atendimento Setoriza"
                className="w-full block"
              />
            </div>
            {/* Floating badges */}
            <div className="absolute -top-4 left-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-md text-xs font-semibold text-slate-700">
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              WhatsApp conectado
            </div>
            <div className="absolute -bottom-4 right-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-md text-xs font-semibold text-slate-700">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Mensagem entregue em tempo real
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <div ref={statsRef} className="bg-[#001638]">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-center md:divide-x divide-white/10">
          <StatCard icon={TrendingUp}    value={100} suffix="%" label="Uptime garantido"                   startCount={statsVisible} />
          <StatCard icon={Clock}         value={300} suffix="ms" label="Latência média de entrega"          startCount={statsVisible} />
          <StatCard icon={Users}         value={10}  suffix="+"  label="Setores simultâneos"                startCount={statsVisible} />
          <StatCard icon={CheckCircle2}  value={99}  suffix="%"  label="Clientes identificados pelo chatbot" startCount={statsVisible} />
        </div>
      </div>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="py-24 px-6"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">Funcionalidades</p>
            <h2 id="features-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#001638] mb-4">
              Tudo que você precisa para escalar o atendimento
            </h2>
            <p className="text-slate-500 max-w-xl leading-relaxed">
              Do primeiro contato ao encerramento do chamado — com rastreamento de SLA, histórico completo e transferências inteligentes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} delay={i * 70} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        aria-labelledby="hiw-heading"
        className="py-24 px-6 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">Como Funciona</p>
            <h2 id="hiw-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#001638] mb-4">
              Da mensagem à resolução em segundos
            </h2>
            <p className="text-slate-500 max-w-xl leading-relaxed">
              Uma arquitetura de microsserviços desenhada para alta performance, segurança e escalabilidade corporativa.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Steps */}
            <div className="flex flex-col gap-5">
              {STEPS.map((step, i) => (
                <StepCard key={step.title} {...step} index={i} />
              ))}
            </div>

            {/* Screenshot */}
            <div className="hidden md:block relative rounded-2xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-900/10">
              <img src={dashboardMockup} alt="Fluxo de atendimento Setoriza" className="w-full block" />
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ───────────────────────────────────────────────── */}
      <section
        id="integrations"
        aria-labelledby="integrations-heading"
        className="py-24 px-6"
      >
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">Integrações</p>
          <h2 id="integrations-heading" className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#001638] mb-4">
            Conecte onde seu cliente já está
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto leading-relaxed mb-12">
            Hoje no WhatsApp, amanhã em todos os canais. O Setoriza foi projetado para crescer junto com o seu negócio.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {INTEGRATIONS.map(({ icon: Icon, label, active, color, bg }) => (
              <Card
                key={label}
                id={`integration-${label.toLowerCase().replace(/[^a-z]/g, '-')}`}
                className="w-40 border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default"
              >
                <CardContent className="flex flex-col items-center gap-3 pt-6 pb-5">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', bg)}>
                    <Icon className={cn('h-6 w-6', color)} />
                  </div>
                  <span className="text-sm font-semibold text-[#001638]">{label}</span>
                  <Badge
                    variant={active ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs',
                      active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-100 border-0'
                    )}
                  >
                    {active ? '● Ativo' : 'Em breve'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-heading"
        className="relative overflow-hidden bg-[#001638] py-24 px-6 text-center"
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[480px] w-[480px] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          <Badge className="mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10" variant="outline">
            Pronto para começar?
          </Badge>
          <h2
            id="cta-heading"
            className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-5"
          >
            Transforme o atendimento<br />da sua empresa hoje
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Entre em contato com nossa equipe e veja como o Setoriza centraliza, organiza e acelera cada conversa da sua equipe.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              id="cta-primary-btn"
              className="bg-white text-[#001638] hover:bg-slate-100 font-bold shadow-xl"
            >
              <Link to="/login">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="mr-2 h-5 w-5 fill-[#001638]"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Saiba Mais
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-8 px-6" role="contentinfo">
        <div className="mx-auto max-w-6xl flex items-center justify-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Setoriza. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
};
