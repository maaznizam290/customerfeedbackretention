"use client";

import { useState, type ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { SignupModal } from "@/components/SignupModal";
import { RewardModal } from "@/components/RewardModal";
import { useSession } from "@/hooks/useSession";
import { SignupModalTrigger } from "@/hooks/useSignupModal";

export function AppChrome({ children }: { children: ReactNode }) {
  const { refresh } = useSession();
  const [signupOpen, setSignupOpen] = useState(false);
  const [reward, setReward] = useState<{ coins: number; balance: number } | null>(null);

  return (
    <SignupModalTrigger openSignup={() => setSignupOpen(true)}>
      <Navbar onOpenSignup={() => setSignupOpen(true)} />
      {children}

      <SignupModal
        isOpen={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSuccess={async ({ coinsAwarded, balance }) => {
          setSignupOpen(false);
          await refresh();
          setReward({ coins: coinsAwarded, balance });
        }}
      />

      {reward && (
        <RewardModal
          isOpen={!!reward}
          onClose={() => setReward(null)}
          coinsEarned={reward.coins}
          newBalance={reward.balance}
        />
      )}
    </SignupModalTrigger>
  );
}
