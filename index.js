const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/generate', async (req, res) => {
  try {
    const { prompt, width, height, ledPattern, soundSystem, equipment } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ledDetails = {
      geometric: 'vibrant geometric patterns in blues, purples, and whites',
      pixel: 'pixel-art style grid patterns with color transitions',
      wave: 'flowing wave patterns in cyan, magenta, and yellow',
      neon: 'bright neon-colored glowing LED panels',
      hologram: '3D holographic rainbow LED effects with depth',
      spectrum: 'full spectrum rainbow colors smoothly transitioning'
    };

    const soundDetails = {
      stereo: 'two large professional subwoofer boxes positioned symmetrically in the foreground',
      quad: 'four speaker boxes arranged in a square formation with professional rigs',
      surround: 'speaker boxes distributed around the stage with full surround coverage',
      line_array: 'professional line array PA system mounted on flying truss structures'
    };

    let enhancedPrompt = prompt;
    
    if (ledPattern && ledDetails[ledPattern]) {
      enhancedPrompt += `, LED wall displaying ${ledDetails[ledPattern]}`;
    }
    
    if (soundSystem && soundDetails[soundSystem]) {
      enhancedPrompt += `, with ${soundDetails[soundSystem]}`;
    }

    enhancedPrompt += `. Stage dimensions ${width}m wide x ${height}m high. Professional event photography, front audience view, high quality render, volumetric lighting, detailed stage design, truss structure, hanging lights, stage decorations, photorealistic, 4k, professional concert venue`;
    
    const imageUrl = await generateImageWithFallback(enhancedPrompt);
    
    res.json({
      image: imageUrl,
      demo: false,
      prompt: enhancedPrompt
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: error.message || 'Image generation failed',
      image: `https://picsum.photos/900/600?random=${Date.now()}`,
      fallback: true
    });
  }
});

async function generateImageWithFallback(prompt) {
  try {
    return await generateWithHuggingFace(prompt);
  } catch (hfError) {
    console.log('HuggingFace failed, trying alternative:', hfError.message);
    try {
      return await generateWithPicsum(prompt);
    } catch (picError) {
      console.log('All services failed, using static placeholder');
      return `https://picsum.photos/900/600?random=${Date.now()}`;
    }
  }
}

async function generateWithHuggingFace(prompt) {
  return new Promise((resolve, reject) => {
    const hfToken = process.env.HUGGINGFACE_API_KEY || 'hf_default_token_placeholder';
    
    const data = JSON.stringify({
      inputs: prompt,
      parameters: {
        negative_prompt: "blurry, low quality, distorted"
      }
    });

    const options = {
      hostname: 'api-inference.huggingface.co',
      path: '/models/stabilityai/stable-diffusion-2',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`HuggingFace API error: ${res.statusCode}`));
          }
          
          const blob = Buffer.from(body, 'binary');
          const base64 = blob.toString('base64');
          const imageUrl = `data:image/jpeg;base64,${base64}`;
          resolve(imageUrl);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function generateWithPicsum(prompt) {
  const seed = Math.abs(prompt.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0));
  return `https://picsum.photos/seed/${seed}/900/600?random=${Date.now()}`;
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log(`Set HUGGINGFACE_API_KEY environment variable for real image generation`);
  console.log(`Get free token at: https://huggingface.co/settings/tokens`);
});