git add .
git commit -m "deploy git"
git push 

export CLOUDFLARE_API_TOKEN = "***REMOVED-CLOUDFLARE-TOKEN***"
export CLOUDFKARE_ACCOUNT_ID = "18c8e61a3669253dcfd0c7eec6be36a3"

wrangler deploy --name danscarlot
