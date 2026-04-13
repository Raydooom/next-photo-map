'use client';
import { motion } from 'framer-motion';
import { Camera, MapPin, Building2 } from 'lucide-react';

interface StatsGridProps {
  className?: string;
}

const stats = [
  {
    label: '照片',
    value: '1,248',
    icon: Camera,
    unit: 'Photos'
  },
  {
    label: '地点',
    value: '86',
    icon: MapPin,
    unit: 'Spots'
  },
  {
    label: '城市',
    value: '24',
    icon: Building2,
    unit: 'Cities'
  }
];

export function StatsGrid({ className }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-3 gap-3 sm:gap-4 ${className || ''}`}>
      {stats.map((stat, index) => (
        <StatCard key={stat.label} stat={stat} index={index} />
      ))}
    </div>
  );
}

interface StatCardProps {
  stat: (typeof stats)[number];
  index: number;
}

function StatCard({ stat, index }: StatCardProps) {
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group rounded-xl border border-foreground/40 border-border/60 bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 sm:p-5"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-9 items-center justify-center rounded-lg border border-foreground/60 border-border/60 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
          <Icon className="size-4 text-foreground/60" />
        </div>
        <div className="text-[14px] uppercase tracking-wider text-muted-foreground">
          {stat.label}
        </div>
        <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {stat.value}
        </div>
      </div>
    </motion.div>
  );
}

// EXIF style info cards for photo details
interface ExifCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export function ExifCard({ label, value, icon }: ExifCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex flex-col items-center gap-1.5">
        <div className="text-muted-foreground">{icon}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}
