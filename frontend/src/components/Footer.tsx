export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">JJ Platform</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">Sistema de gestión para academias de artes marciales</span>
        </div>
        <p className="text-xs text-gray-400">© {year} JJ Platform. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
