import { motion } from 'framer-motion';
import { User, Phone, CheckCircle2, History } from 'lucide-react';
import type { ClientSearchResult } from '../../hooks/shared/useClientSearch';

interface Props {
  client: ClientSearchResult;
  onSelect: () => void;
  isSelected?: boolean;
}

const ClientPreviewCard = ({ client, onSelect, isSelected }: Props) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
        isSelected 
          ? 'bg-gold/10 border-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-[#0A0F1E] border border-white/10 flex items-center justify-center overflow-hidden">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt={client.full_name} className="w-full h-full object-cover" />
          ) : (
            <User className="text-[#475569]" size={24} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-white truncate">{client.full_name}</h4>
            {isSelected && <CheckCircle2 size={16} className="text-gold shrink-0" />}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] text-[#475569] font-mono uppercase tracking-wider">{client.client_code}</p>
            <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
              <Phone size={10} />
              {client.phone}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Last Service */}
      {client.last_service_name && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History size={12} className="text-[#475569]" />
            <span className="text-[10px] text-[#475569] uppercase font-bold tracking-widest">Last Service</span>
          </div>
          <span className="text-[10px] font-bold text-white bg-white/5 px-2 py-0.5 rounded">
            {client.last_service_name}
          </span>
        </div>
      )}

      {/* Selected Indicator Glow */}
      {isSelected && (
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-gold/20 via-transparent to-gold/20 opacity-50 pointer-events-none" />
      )}
    </motion.div>
  );
};

export default ClientPreviewCard;
