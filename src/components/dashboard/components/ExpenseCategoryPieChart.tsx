// src/components/dashboard/components/ExpenseCategoryPieChart.tsx

"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { FinancialRecord, FinancialCategory } from '@/types';
import { cn } from '@/lib/utils';

interface ExpenseCategoryPieChartProps {
  financialRecords: FinancialRecord[];
  financialCategories: FinancialCategory[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-background/90 border rounded-lg shadow-xl backdrop-blur-sm">
        <p className="font-bold text-base">{data.name}</p>
        <p className="text-sm text-foreground">{formatCurrency(data.value)}</p>
        <p className="text-xs text-muted-foreground">{`(${(data.percent * 100).toFixed(1)}%)`}</p>
      </div>
    );
  }
  return null;
};

const ActiveShape = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-midAngle * (Math.PI / 180));
  const cos = Math.cos(-midAngle * (Math.PI / 180));
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold text-lg">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-sm font-medium">{payload.name}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {formatCurrency(value)}
      </text>
    </g>
  );
};


export function ExpenseCategoryPieChart({ financialRecords, financialCategories }: ExpenseCategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const data = useMemo(() => {
    const categoryMap = new Map(financialCategories.map(cat => [cat.id, cat.name]));
    
    const expensesByCategory = financialRecords
      .filter(record => record.type === 'expense' && !record.isDeleted)
      .reduce((acc, record) => {
        const categoryName = categoryMap.get(record.categoryId) || record.category || 'Sin Categoría';
        acc[categoryName] = (acc[categoryName] || 0) + record.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [financialRecords, financialCategories]);
  
  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, [setActiveIndex]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No hay datos de gastos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoría</CardTitle>
        <CardDescription>Distribución de los gastos totales por categoría.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={ActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
