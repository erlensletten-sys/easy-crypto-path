const QRCodeDisplay = () => {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* QR Code placeholder - styled to look like a real QR */}
      <div className="bg-foreground p-3 rounded-lg">
        <div className="w-32 h-32 grid grid-cols-8 gap-0.5">
          {Array.from({ length: 64 }).map((_, i) => (
            <div
              key={i}
              className={`w-full aspect-square ${
                Math.random() > 0.4 ? 'bg-background' : 'bg-transparent'
              }`}
              style={{
                backgroundColor: [0, 1, 2, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 40, 41, 42, 45, 46, 47, 48, 49, 50, 53, 54, 55, 56, 57, 58, 61, 62, 63].includes(i) 
                  ? 'hsl(230 25% 8%)' 
                  : i % 3 === 0 ? 'hsl(230 25% 8%)' : 'transparent'
              }}
            />
          ))}
        </div>
      </div>
      
      <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Deposit history
      </button>
    </div>
  );
};

export default QRCodeDisplay;
