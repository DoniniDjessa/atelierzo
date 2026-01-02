Admin side on commande 'page table', 'adresse de livraison', 'info de la commande (nom du produits, tailles)','details'  scrollable horizontally

2-on commande page, when we use the filter its doesnt reduce pages, but we have to go to x page to find the target items , let fix it

3-we have En attente
83
En traitement
0
Terminées
0
lets add 'confirmés' too


import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import AuthModal from './AuthModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;


when a client make a order, lets dont allow him to make the


