

"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Company } from '@/types';
import { MultipleFileInput } from '@/components/common/multiple-file-input';
import { openSafeUrl } from '@/lib/security/safe-url';
