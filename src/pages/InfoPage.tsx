import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Shield, BookOpen, Users, HelpCircle, Mail, Phone, Building, FileText, Heart } from 'lucide-react';
import { motion } from 'motion/react';

type PageType = 'about' | 'careers' | 'contact' | 'help' | 'privacy' | 'terms' | 'guidelines';

export function InfoPage({ type }: { type: PageType }) {
  const content = {
    about: {
      title: 'About ShouldReach',
      icon: Building,
      body: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-slate-600"
        >
          <p className="text-lg">
            ShouldReach is India's premier professional network designed specifically for students, professors, and academic institutions. Our mission is to bridge the gap between academic learning and professional success.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-8">Our Vision</h3>
          <p>
            We envision a world where every student has access to the right mentorship, opportunities, and network to achieve their career goals, regardless of their background or location.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-8">What We Do</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Connect students with industry professionals and academic mentors.</li>
            <li>Provide a platform for showcasing projects, research, and achievements.</li>
            <li>Facilitate knowledge sharing through success stories and community discussions.</li>
            <li>Help universities track and support their alumni networks.</li>
          </ul>
        </motion.div>
      )
    },
    careers: {
      title: 'Careers at ShouldReach',
      icon: Users,
      body: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-slate-600"
        >
          <p className="text-lg">
            Join us in our mission to empower the next generation of professionals. We're always looking for passionate individuals to join our team.
          </p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mt-8">
            <h3 className="text-xl font-bold text-indigo-900 mb-2">Current Openings</h3>
            <p className="text-indigo-700 mb-4">
              We are currently a small, fast-growing team. While we don't have specific roles listed right now, we are always open to hearing from talented engineers, designers, and community managers.
            </p>
            <p className="font-medium text-indigo-900">
              Send your resume to: <a href="mailto:official@shouldreach.com" className="text-indigo-600 hover:underline">official@shouldreach.com</a>
            </p>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-8">Why Work With Us?</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Impactful work that directly helps students succeed.</li>
            <li>Remote-first, flexible work culture.</li>
            <li>Continuous learning and growth opportunities.</li>
          </ul>
        </motion.div>
      )
    },
    contact: {
      title: 'Contact Us',
      icon: Mail,
      body: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-8 text-slate-600"
        >
          <p className="text-lg">
            Have a question, feedback, or need support? We're here to help. Reach out to us through any of the channels below.
          </p>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Phone</h3>
              <p className="text-slate-600 mb-4">Mon-Fri from 9am to 6pm IST</p>
              <a href="tel:+919990662939" className="text-lg font-bold text-indigo-600 hover:text-indigo-700">
                +91 9990662939
              </a>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Email</h3>
              <p className="text-slate-600 mb-4">We'll respond within 24 hours</p>
              <a href="mailto:official@shouldreach.com" className="text-lg font-bold text-indigo-600 hover:text-indigo-700">
                official@shouldreach.com
              </a>
            </div>
          </div>
        </motion.div>
      )
    },
    help: {
      title: 'Help Center',
      icon: HelpCircle,
      body: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-slate-600"
        >
          <p className="text-lg">
            Find answers to common questions and learn how to make the most of ShouldReach.
          </p>
          
          <div className="space-y-4 mt-8">
            <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden">
              <summary className="font-bold text-slate-900 p-4 cursor-pointer hover:bg-slate-50">How do I verify my university email?</summary>
              <div className="p-4 pt-0 text-sm border-t border-slate-100">
                You can verify your university email by going to your profile settings and clicking on "Verify Email". We will send a verification link to your academic email address.
              </div>
            </details>
            <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden">
              <summary className="font-bold text-slate-900 p-4 cursor-pointer hover:bg-slate-50">How can I connect with alumni?</summary>
              <div className="p-4 pt-0 text-sm border-t border-slate-100">
                Use the Network tab to search for alumni from your university. You can filter by graduation year, industry, or company to find relevant mentors.
              </div>
            </details>
            <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden">
              <summary className="font-bold text-slate-900 p-4 cursor-pointer hover:bg-slate-50">Is ShouldReach free for students?</summary>
              <div className="p-4 pt-0 text-sm border-t border-slate-100">
                Yes! The core features of ShouldReach are completely free for students. We also offer premium features for advanced networking and job search tools.
              </div>
            </details>
          </div>
          
          <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="mb-4">Still need help?</p>
            <Link to="/contact" className="inline-flex items-center justify-center px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              Contact Support
            </Link>
          </div>
        </motion.div>
      )
    },
    privacy: {
      title: 'Privacy Policy',
      icon: Shield,
      body: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-slate-600 prose prose-indigo max-w-none"
        >
          <p className="text-sm text-slate-500">Last updated: March 2026</p>
          <p>
            At ShouldReach, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">1. Information We Collect</h3>
          <p>
            We collect information that you provide directly to us, such as when you create an account, update your profile, or communicate with us. This includes your name, email address, educational history, and professional experience.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">2. How We Use Your Information</h3>
          <p>
            We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to personalize your experience on ShouldReach.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">3. Information Sharing</h3>
          <p>
            We do not sell your personal information. We may share your information with other users as part of the platform's networking features (based on your privacy settings), or with service providers who assist us in operating our platform.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">4. Your Choices</h3>
          <p>
            You can access and update your profile information at any time. You can also adjust your privacy settings to control who can see your profile and activity.
          </p>
        </motion.div>
      )
    },
    terms: {
      title: 'Terms of Service',
      icon: FileText,
      body: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-slate-600 prose prose-indigo max-w-none"
        >
          <p className="text-sm text-slate-500">Last updated: March 2026</p>
          <p>
            Welcome to ShouldReach. By accessing or using our platform, you agree to be bound by these Terms of Service.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">1. Acceptance of Terms</h3>
          <p>
            By creating an account or using ShouldReach, you agree to these terms. If you do not agree, you may not use our services.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">2. User Accounts</h3>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">3. Acceptable Use</h3>
          <p>
            You agree not to use ShouldReach for any unlawful purpose or in any way that violates our Community Guidelines. This includes, but is not limited to, harassment, spamming, or posting inappropriate content.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-6">4. Intellectual Property</h3>
          <p>
            You retain ownership of the content you post on ShouldReach. However, by posting content, you grant us a non-exclusive license to use, display, and distribute that content on our platform.
          </p>
        </motion.div>
      )
    },
    guidelines: {
      title: 'Community Guidelines',
      icon: Heart,
      body: (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-slate-600 prose prose-indigo max-w-none"
        >
          <p className="text-lg">
            ShouldReach is a professional community. We expect all members to treat each other with respect and professionalism.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="bg-green-50 border border-green-100 p-6 rounded-xl">
              <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-700">✓</span>
                Do
              </h3>
              <ul className="space-y-2 text-green-800 text-sm">
                <li>• Be respectful and professional in all interactions.</li>
                <li>• Share helpful knowledge, experiences, and opportunities.</li>
                <li>• Constructively engage in discussions.</li>
                <li>• Use your real name and accurate professional information.</li>
              </ul>
            </div>
            
            <div className="bg-red-50 border border-red-100 p-6 rounded-xl">
              <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700">✕</span>
                Don't
              </h3>
              <ul className="space-y-2 text-red-800 text-sm">
                <li>• Harass, bully, or discriminate against other members.</li>
                <li>• Post spam, promotional content, or irrelevant links.</li>
                <li>• Share confidential or proprietary information.</li>
                <li>• Create fake profiles or misrepresent your identity.</li>
              </ul>
            </div>
          </div>
          
          <p className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            Violations of these guidelines may result in content removal or account suspension. If you see something that violates these guidelines, please report it to our moderation team.
          </p>
        </motion.div>
      )
    }
  };

  const pageData = content[type];
  const Icon = pageData.icon;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-indigo-600 px-8 py-12 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">{pageData.title}</h1>
          </div>
          <div className="p-8 md:p-12">
            {pageData.body}
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link to="/home" className="text-indigo-600 font-medium hover:text-indigo-700">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
