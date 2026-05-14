const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async rewrites() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) return [];
        return [
            {
                source: '/supabase-proxy/:path*',
                destination: `${supabaseUrl}/:path*`,
            },
        ];
    },
};

export default nextConfig;
