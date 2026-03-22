'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface IllustrationProps {
  className?: string;
}

export function NoDataIllustration({ className }: IllustrationProps) {
  return (
    <motion.svg
      className={className}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background circle */}
      <motion.circle
        cx="100"
        cy="100"
        r="80"
        fill="currentColor"
        className="text-primary/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      />

      {/* Folder */}
      <motion.path
        d="M50 70 L150 70 L150 140 L50 140 Z"
        fill="currentColor"
        className="text-primary/20"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      />
      <motion.path
        d="M50 70 L80 70 L90 60 L150 60 L150 70"
        fill="currentColor"
        className="text-primary/30"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      />

      {/* Empty state lines */}
      <motion.line
        x1="70"
        y1="90"
        x2="130"
        y2="90"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-muted-foreground/30"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      />
      <motion.line
        x1="70"
        y1="105"
        x2="110"
        y2="105"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-muted-foreground/30"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      />
      <motion.line
        x1="70"
        y1="120"
        x2="120"
        y2="120"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-muted-foreground/30"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
      />
    </motion.svg>
  );
}

export function NoClientsIllustration({ className }: IllustrationProps) {
  return (
    <motion.svg
      className={className}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background */}
      <motion.circle
        cx="100"
        cy="100"
        r="80"
        fill="currentColor"
        className="text-blue-500/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      />

      {/* Person outline */}
      <motion.circle
        cx="100"
        cy="80"
        r="20"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        className="text-blue-500/50"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      />
      <motion.path
        d="M70 130 Q100 110 130 130 L130 150 L70 150 Z"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        className="text-blue-500/50"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      />

      {/* Plus sign */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
      >
        <circle cx="140" cy="70" r="15" fill="currentColor" className="text-primary" />
        <line
          x1="140"
          y1="63"
          x2="140"
          y2="77"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="133"
          y1="70"
          x2="147"
          y2="70"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </motion.g>
    </motion.svg>
  );
}

export function NoVehiclesIllustration({ className }: IllustrationProps) {
  return (
    <motion.svg
      className={className}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background */}
      <motion.circle
        cx="100"
        cy="100"
        r="80"
        fill="currentColor"
        className="text-indigo-500/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      />

      {/* Car body */}
      <motion.path
        d="M60 110 L70 90 L130 90 L140 110 L140 130 L60 130 Z"
        fill="currentColor"
        className="text-indigo-500/30"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      />

      {/* Wheels */}
      <motion.circle
        cx="75"
        cy="130"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        className="text-indigo-500/50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      />
      <motion.circle
        cx="125"
        cy="130"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        className="text-indigo-500/50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      />

      {/* Windows */}
      <motion.rect
        x="75"
        y="95"
        width="20"
        height="12"
        fill="currentColor"
        className="text-indigo-500/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      />
      <motion.rect
        x="105"
        y="95"
        width="20"
        height="12"
        fill="currentColor"
        className="text-indigo-500/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      />
    </motion.svg>
  );
}

export function NoTransactionsIllustration({ className }: IllustrationProps) {
  return (
    <motion.svg
      className={className}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background */}
      <motion.circle
        cx="100"
        cy="100"
        r="80"
        fill="currentColor"
        className="text-green-500/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      />

      {/* Receipt */}
      <motion.rect
        x="70"
        y="60"
        width="60"
        height="80"
        rx="4"
        fill="currentColor"
        className="text-green-500/20"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 60, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      />

      {/* Receipt lines */}
      {[0, 1, 2, 3].map((i) => (
        <motion.line
          key={i}
          x1="80"
          y1={80 + i * 15}
          x2="120"
          y2={80 + i * 15}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-green-500/40"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
        />
      ))}

      {/* Dollar sign */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
      >
        <circle cx="140" cy="110" r="18" fill="currentColor" className="text-primary" />
        <text
          x="140"
          y="120"
          textAnchor="middle"
          fill="white"
          fontSize="24"
          fontWeight="bold"
        >
          $
        </text>
      </motion.g>
    </motion.svg>
  );
}

export function SearchIllustration({ className }: IllustrationProps) {
  return (
    <motion.svg
      className={className}
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background */}
      <motion.circle
        cx="100"
        cy="100"
        r="80"
        fill="currentColor"
        className="text-purple-500/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      />

      {/* Magnifying glass circle */}
      <motion.circle
        cx="90"
        cy="90"
        r="30"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        className="text-purple-500/50"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      />

      {/* Magnifying glass handle */}
      <motion.line
        x1="112"
        y1="112"
        x2="135"
        y2="135"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-purple-500/50"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      />

      {/* Question mark inside */}
      <motion.text
        x="90"
        y="105"
        textAnchor="middle"
        fill="currentColor"
        fontSize="32"
        fontWeight="bold"
        className="text-purple-500/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        ?
      </motion.text>
    </motion.svg>
  );
}
