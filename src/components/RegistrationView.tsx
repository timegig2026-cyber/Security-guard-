import React, { useState } from 'react';
import { getAuthInstance } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

export const RegistrationView: React.FC<{ onAuthSuccess: () => void }> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [step, setStep] = useState(1); // 1: Credentials, 2: Terms, 3: Success
  const [errorMessage, setErrorMessage] = useState('');

  const auth = getAuthInstance();

  const handleSignup = async () => {
    if (!acceptedTerms) return;
    setErrorMessage('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setStep(3);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please login.');
      } else {
        setErrorMessage('Signup failed. Please try again.');
      }
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onAuthSuccess();
    } catch (error: any) {
      console.error(error);
      setErrorMessage('Login failed. Please check your credentials.');
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100"
      >
        <AnimatePresence mode="wait">
          {step === 3 ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-4"
            >
              <h1 className="text-3xl font-bold text-slate-900">Congratulations!</h1>
              <p className="text-slate-600">Your account has been created. You have a 30-day free trial.</p>
              <button 
                onClick={onAuthSuccess} 
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to App
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h1 className="text-2xl font-bold text-slate-900">{isLogin ? 'Login to your account' : 'Create your account'}</h1>
              
              {step === 1 && (
                <div className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                      {errorMessage}
                    </div>
                  )}
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                    value={email} 
                    onChange={e => handleInputChange(setEmail, e.target.value)} 
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                    value={password} 
                    onChange={e => handleInputChange(setPassword, e.target.value)} 
                  />
                  {isLogin ? (
                    <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-all">Login</button>
                  ) : (
                    <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-all">Continue</button>
                  )}
                  <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 w-full hover:underline">
                    {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <p className="text-sm text-slate-600 leading-relaxed">By signing up, you agree to our Terms and Conditions and acknowledge that you have read our Privacy Policy. You will receive a 30-day trial upon successful registration.</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="w-5 h-5 accent-blue-600" />
                    <span className="text-sm text-slate-700">I accept terms and conditions</span>
                  </label>
                  <button onClick={handleSignup} disabled={!acceptedTerms} className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Sign Up</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
