const SpaceBackground = () => {
    return (
        <>
            <style>
                {`
                    @keyframes space-drift {
                        from { transform: translateY(0); }
                        to { transform: translateY(-1000px); }
                    }
                    .global-stars {
                        position: fixed;
                        inset: 0;
                        background-image: 
                            radial-gradient(1px 1px at 20px 30px, #eee, rgba(0,0,0,0)),
                            radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
                            radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
                            radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0));
                        background-size: 200px 200px;
                        animation: space-drift 100s linear infinite;
                        opacity: 0.2;
                        pointer-events: none;
                        z-index: 0;
                    }
                    .global-nebula {
                        position: fixed;
                        width: 150%;
                        height: 150%;
                        top: -25%;
                        left: -25%;
                        background: radial-gradient(circle at 30% 70%, rgba(100, 80, 255, 0.05) 0%, transparent 40%),
                                    radial-gradient(circle at 70% 30%, rgba(255, 50, 200, 0.03) 0%, transparent 40%);
                        filter: blur(80px);
                        pointer-events: none;
                        z-index: 0;
                    }
                `}
            </style>
            <div className="global-nebula" />
            <div className="global-stars" />
        </>
    );
};

export default SpaceBackground;
