import React, { useEffect, useRef, useState } from 'react';
import { Camera, FolderOpen, Trash2, X } from 'lucide-react';

interface AvatarDropdownProps {
  avatarUrl: string | null;
  userName: string;
  size?: 'sm' | 'md' | 'lg';
  onChangeAvatar: (base64OrNull: string | null) => void;
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();

export const AvatarDropdown: React.FC<AvatarDropdownProps> = ({
  avatarUrl,
  userName,
  size = 'md',
  onChangeAvatar
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarBtnRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fecha dropdown ao clicar fora ou tecla ESC
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (avatarBtnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const handlerEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handlerEsc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handlerEsc);
    };
  }, [menuOpen]);

  // === File picker => Base64 ===
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = (ev.target?.result as string) || '';
      if (dataUrl) {
        onChangeAvatar(dataUrl);
        setMenuOpen(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = () => {
    onChangeAvatar(null);
    setMenuOpen(false);
  };

  // Sizes
  const SIZE_MAP = {
    sm: {
      avatar: 'w-9 h-9 text-[13px]',
      badge: 'w-[22px] h-[22px] bottom-0 right-0',
      cameraBadge: 10,
      overlay: 'w-9 h-9',
      menuW: 'w-[220px]'
    },
    md: {
      avatar: 'w-[46px] h-[46px] text-[15px]',
      badge: 'w-7 h-7 bottom-0 right-0',
      cameraBadge: 12,
      overlay: 'w-[46px] h-[46px]',
      menuW: 'w-[240px]'
    },
    lg: {
      avatar: 'w-24 h-24 text-2xl',
      badge: 'w-8 h-8 bottom-0 right-0',
      cameraBadge: 14,
      overlay: 'w-24 h-24',
      menuW: 'w-[240px]'
    }
  } as const;
  const s = SIZE_MAP[size];

  return (
    <div className="relative inline-flex shrink-0 z-40">
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFilePick}
      />

      {/* Botão Avatar */}
      <button
        type="button"
        ref={avatarBtnRef}
        onClick={() => setMenuOpen(o => !o)}
        className="group block relative focus:outline-none"
        title="Editar foto de perfil"
      >
        <div
          className={`${s.avatar} rounded-full overflow-hidden ring-2 ring-slate-200 shadow-sm bg-white flex items-center justify-center text-[#0e69b2] font-black transition group-hover:ring-[#0e69b2]/40 group-hover:scale-[1.02]`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="uppercase tracking-wide">{getInitials(userName) || 'U'}</span>
          )}
        </div>
        {/* Overlay hover */}
        <div className={`absolute inset-0 ${s.overlay} rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none`}>
          <Camera size={s.overlay === 'w-9 h-9' ? 12 : 16} strokeWidth={2.5} className="text-white" />
        </div>
        {/* Badge câmera fixo */}
        <div
          className={`absolute ${s.badge} rounded-full bg-white text-[#0e69b2] border-2 border-white shadow-md flex items-center justify-center`}
        >
          <Camera size={s.cameraBadge} strokeWidth={2.5} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            className={`absolute z-[60] left-1/2 -translate-x-1/2 mt-2 origin-top ${s.menuW} animate-pop-in`}
            role="menu"
            aria-label="Opções de foto do perfil"
            style={{ top: '100%' }}
          >
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/15 overflow-hidden ring-1 ring-black/5">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Foto de Perfil
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 cursor-pointer"
                  aria-label="Fechar menu"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-1.5 space-y-1">
                {/* Opção 1: Selecionar arquivo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-[#0e69b2] transition-colors group cursor-pointer"
                  role="menuitem"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-700 border border-slate-200 group-hover:border-blue-200 flex items-center justify-center shrink-0">
                    <FolderOpen size={14} strokeWidth={2.3} />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-[11.5px] font-extrabold leading-tight truncate">
                      📂 Selecionar arquivo
                    </span>
                    <span className="block text-[9px] text-slate-500 leading-snug group-hover:text-blue-700/80 truncate">
                      Enviar foto da galeria / celular
                    </span>
                  </div>
                </button>

                {/* Opção 2: Excluir foto (condicional) */}
                {avatarUrl && (
                  <>
                    <div className="h-px bg-slate-100 mx-1" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors group cursor-pointer"
                      role="menuitem"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-rose-100 text-slate-600 group-hover:text-rose-700 border border-slate-200 group-hover:border-rose-200 flex items-center justify-center shrink-0">
                        <Trash2 size={14} strokeWidth={2.3} />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block text-[11.5px] font-extrabold leading-tight truncate">
                          🗑️ Excluir foto atual
                        </span>
                        <span className="block text-[9px] text-slate-500 leading-snug group-hover:text-rose-700/80 truncate">
                          Voltar para avatar com iniciais
                        </span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Setinha */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 rotate-45 bg-white border-t border-l border-slate-200 z-50"
            />
          </div>
        </>
      )}
    </div>
  );
};
