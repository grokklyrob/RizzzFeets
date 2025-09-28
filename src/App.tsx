import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Generator } from './components/Generator';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';
import { DigitalIncense } from './components/DigitalIncense';
import type { User, SubscriptionTier, GoogleJwtPayload } from './types';
import { Tiers } from './constants';
import { redirectToCheckout, syncSubscriptionStatus } from './services/stripeService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('touchfeets_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('touchfeets_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('touchfeets_user');
    }
  }, [user]);

  // Handle successful Google Sign-In, now receiving the payload directly
  const handleAuthSuccess = useCallback((payload: GoogleJwtPayload) => {
    // This is a placeholder for fetching user data from your database.
    const existingUser = localStorage.getItem(`user_${payload.sub}`);
    if (existingUser) {
        setUser(JSON.parse(existingUser));
    } else {
        const newUser: User = {
            googleId: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            tier: Tiers.FREE,
            generationsLeft: Tiers.FREE.generations,
        };
        localStorage.setItem(`user_${payload.sub}`, JSON.stringify(newUser));
        setUser(newUser);
    }
  }, []);
  
  const handleSignOut = useCallback(() => {
      if(user) {
        // In a real app, you'd also invalidate the session on the backend.
        localStorage.removeItem(`user_${user.googleId}`);
      }
      setUser(null);
      localStorage.removeItem('touchfeets_user');
  }, [user]);
  
  const handleUpgrade = useCallback(async (tier: SubscriptionTier) => {
      if (!user) {
          alert("Please sign in to upgrade your plan.");
          return;
      }
      try {
        await redirectToCheckout(tier.priceId, user.email);
      } catch (error) {
        console.error("Stripe Checkout Error:", error);
        alert((error as Error).message);
      }
  }, [user]);

  const decrementGenerations = useCallback(() => {
    setUser(prevUser => {
      if (!prevUser || prevUser.generationsLeft <= 0) return prevUser;
      const updatedUser = { ...prevUser, generationsLeft: prevUser.generationsLeft - 1 };
      // Also update the specific user record in storage
      localStorage.setItem(`user_${updatedUser.googleId}`, JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);
  
  const handleSyncPlan = useCallback(async () => {
    if (!user) {
      console.warn("Sync attempted without a logged-in user.");
      throw new Error("You must be signed in to sync your plan.");
    }

    try {
      const activeTierId = await syncSubscriptionStatus(user.email);
      const newTier = Object.values(Tiers).find(t => t.id === activeTierId);
      
      if (newTier) {
        const hasTierChanged = user.tier.id !== newTier.id;

        setUser(prevUser => {
          if (!prevUser) return null;
          
          const updatedUser = {
            ...prevUser,
            tier: newTier,
            // If the tier has changed, reset generations to the new tier's monthly amount.
            // If not, leave the current count as is.
            generationsLeft: hasTierChanged ? newTier.generations : prevUser.generationsLeft,
          };
          localStorage.setItem(`user_${updatedUser.googleId}`, JSON.stringify(updatedUser));
          return updatedUser;
        });

        if (hasTierChanged) {
            alert(`Your plan has been updated to ${newTier.name}!`);
        } else {
            alert('Your plan is up to date.');
        }

      } else {
        throw new Error(`Unknown tier ID received from server: ${activeTierId}`);
      }
    } catch (error) {
        console.error("Failed to sync plan:", error);
        alert(`Failed to sync your plan: ${(error as Error).message}`);
        // Re-throw so the UI can know the sync failed
        throw error;
    }
  }, [user]);

  // Effect to handle redirect from Stripe checkout - NOW IMPROVED
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const wasSuccess = query.get("checkout_success");
    const wasCanceled = query.get("checkout_canceled");

    if (wasSuccess && user) {
      console.log("Checkout successful! Syncing your new plan...");
      // Instead of relying on insecure client-side logic, we ask the backend for the source of truth.
      handleSyncPlan(); 
      localStorage.removeItem('touchfeets_upgrade_tier'); // Clean up old item just in case
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (wasCanceled) {
      console.log("Order canceled.");
       localStorage.removeItem('touchfeets_upgrade_tier');
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, handleSyncPlan]);


  return (
    <div className="relative min-h-screen bg-black text-gray-200 overflow-hidden">
      <DigitalIncense />
      <div className="relative z-10">
        <Header user={user} onSignOut={handleSignOut} onAuthSuccess={handleAuthSuccess} onSyncPlan={handleSyncPlan} />
        <main>
          <Hero />
          <Generator user={user} onGenerate={decrementGenerations} />
          <Pricing onUpgrade={handleUpgrade} />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default App;