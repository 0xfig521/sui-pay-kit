import type { TokenSymbol } from "@suitrustpay/shared";
import { create } from "zustand";

interface CheckoutState {
  selectedToken: TokenSymbol;
  setSelectedToken: (token: TokenSymbol) => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  selectedToken: "SUI",
  setSelectedToken: (selectedToken) => set({ selectedToken }),
}));
