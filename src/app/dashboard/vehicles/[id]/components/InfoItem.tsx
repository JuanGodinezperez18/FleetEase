
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/common/data-table';
import { Briefcase, TrendingUp } from 'lucide-react';
import type { VehicleAssignmentLog, FinancialRecord } from '@/types';
import { transactionsColumns, assignmentColumns } from '../columns';

export const InfoItem = ({ icon, label, value, valueClassName = '' }: { icon: React.ReactNode, label: string, value: React.ReactNode, valueClassName?: string }) => (
    <div className="flex items-start">
        <div className="mr-4 text-muted-foreground">{icon}</div>
        <div className="flex-grow">
            <p className="font-semibold text-muted-foreground">{label}</p>
            <p className={`text-lg ${valueClassName}`}>{value}</p>
        </div>
    </div>
);
