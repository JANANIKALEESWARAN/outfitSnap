import React, { createContext, useEffect, useMemo, useState } from 'react';

export const WishlistContext = createContext(null);
const STORAGE_PREFIX = 'wishlist-items-v1::';

const WishlistProvider = ({ children }) => {
  const userKey = localStorage.getItem('user-key') || 'guest';
  const storageKey = `${STORAGE_PREFIX}${userKey}`;

  const [wishlist, setWishlist] = useState(() => {
    try {
      // 1) Current per-user storage
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);

      // 2) Legacy token-based key
      const token = localStorage.getItem('auth-token') || '';
      const legacyTokenKey = token ? `${STORAGE_PREFIX}${token}` : '';
      if (legacyTokenKey) {
        const legacyTokenRaw = localStorage.getItem(legacyTokenKey);
        if (legacyTokenRaw) return JSON.parse(legacyTokenRaw);
      }

      // 3) Legacy global key (pre-accounts)
      const legacyGlobalKey = 'wishlist-items-v1';
      const legacyGlobalRaw = localStorage.getItem(legacyGlobalKey);
      if (legacyGlobalRaw) return JSON.parse(legacyGlobalRaw);

      // 4) Guest carry-over (optional)
      const guestKey = `${STORAGE_PREFIX}guest`;
      const guestRaw = localStorage.getItem(guestKey);
      if (guestRaw) return JSON.parse(guestRaw);

      return [];
    } catch (e) {
      return [];
    }
  });

  // When the user changes (user-key changes), load that user's wishlist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setWishlist(JSON.parse(raw));
    } catch {
      setWishlist([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggleWishlist = (id) => {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const clearWishlist = () => setWishlist([]);
  const isWishlisted = (id) => wishlist.includes(id);
  const count = wishlist.length;

  const value = useMemo(
    () => ({ wishlist, toggleWishlist, clearWishlist, isWishlisted, count }),
    [wishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export default WishlistProvider;
