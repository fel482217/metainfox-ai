// Metainfox AI - AI Service with Groq (Llama 3.1)

import type { AIAnalysisRequest, AIAnalysisResponse, RiskCategory, RiskSeverity } from '../types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-70b-versatile';

/**
 * Analiza un riesgo potencial usando IA
 */
export async function analyzeRisk(
  apiKey: string,
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const prompt = buildRiskAnalysisPrompt(request);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `Eres un experto analista de riesgos empresariales. Tu trabajo es analizar amenazas y clasificarlas por categoría, severidad e impacto. Debes proporcionar análisis precisos, concisos y accionables.

Categorías válidas: cybersecurity, financial, operational, reputational, regulatory, strategic
Severidades válidas: critical, high, medium, low

Responde siempre en formato JSON con esta estructura:
{
  "category": "categoria",
  "severity": "severidad",
  "analysis": "análisis detallado",
  "confidence": 0.95,
  "keywords": ["palabra1", "palabra2"],
  "recommendations": ["acción 1", "acción 2"],
  "impact_score": 85,
  "likelihood_score": 70
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Groq response');
    }

    const parsed = JSON.parse(content);

    return {
      analysis: parsed.analysis || parsed.recommendations?.join('. ') || 'Análisis no disponible',
      confidence: parsed.confidence || 0.8,
      category: parsed.category as RiskCategory,
      severity: parsed.severity as RiskSeverity,
      keywords: parsed.keywords || [],
      sentiment: parsed.sentiment
    };

  } catch (error) {
    console.error('AI Analysis error:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Analiza sentimiento de texto (noticias, redes sociales)
 */
export async function analyzeSentiment(
  apiKey: string,
  text: string
): Promise<{ sentiment: number; explanation: string }> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Analiza el sentimiento del texto proporcionado. Devuelve un score de -1 (muy negativo) a 1 (muy positivo) y una breve explicación. Responde en JSON: {"sentiment": 0.5, "explanation": "..."}'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    
    return {
      sentiment: parsed.sentiment || 0,
      explanation: parsed.explanation || 'Análisis no disponible'
    };

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return { sentiment: 0, explanation: 'Error en análisis' };
  }
}

/**
 * Clasifica texto en categorías de riesgo
 */
export async function classifyRisk(
  apiKey: string,
  text: string
): Promise<{ category: RiskCategory; confidence: number }> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `Clasifica el siguiente texto en una de estas categorías de riesgo:
- cybersecurity: vulnerabilidades, ataques, brechas de seguridad
- financial: fraude, pérdidas económicas, problemas financieros
- operational: fallos operativos, interrupciones de servicio
- reputational: daño a la imagen, crisis de PR
- regulatory: incumplimiento normativo, regulaciones
- strategic: amenazas competitivas, cambios de mercado

Responde en JSON: {"category": "categoria", "confidence": 0.95}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    
    return {
      category: parsed.category as RiskCategory,
      confidence: parsed.confidence || 0.8
    };

  } catch (error) {
    console.error('Classification error:', error);
    return { category: 'operational', confidence: 0.5 };
  }
}

/**
 * Genera un reporte ejecutivo de riesgos
 */
export async function generateExecutiveReport(
  apiKey: string,
  risks: any[]
): Promise<string> {
  const summary = `Analiza estos ${risks.length} riesgos y genera un reporte ejecutivo conciso con:
1. Resumen de situación actual
2. Principales amenazas
3. Recomendaciones prioritarias

Riesgos: ${JSON.stringify(risks, null, 2)}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un analista ejecutivo de riesgos. Genera reportes concisos y accionables para alta dirección.'
          },
          {
            role: 'user',
            content: summary
          }
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No se pudo generar el reporte';

  } catch (error) {
    console.error('Report generation error:', error);
    return 'Error al generar reporte ejecutivo';
  }
}

/**
 * Construye el prompt para análisis de riesgo
 */
function buildRiskAnalysisPrompt(request: AIAnalysisRequest): string {
  let prompt = `Analiza el siguiente riesgo potencial:\n\n${request.text}`;
  
  if (request.context) {
    prompt += `\n\nContexto adicional: ${request.context}`;
  }

  prompt += '\n\nProporciona un análisis detallado incluyendo categoría, severidad, recomendaciones y scores de impacto y probabilidad.';

  return prompt;
}

/**
 * Chat interactivo para consultas sobre riesgos
 */
export async function chatWithAI(
  apiKey: string,
  userMessage: string,
  context?: any
): Promise<string> {
  const systemPrompt = `Eres el asistente de IA de Metainfox AI, un sistema de gestión de riesgos empresariales. 

Tu función es ayudar a analizar riesgos, responder preguntas sobre seguridad, compliance, y proporcionar recomendaciones estratégicas.

Eres profesional, conciso y orientado a la acción. Cuando sea posible, proporciona pasos concretos.`;

  let userPrompt = userMessage;
  if (context) {
    userPrompt += `\n\nContexto del sistema:\n${JSON.stringify(context, null, 2)}`;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No pude procesar tu consulta';

  } catch (error) {
    console.error('Chat error:', error);
    return 'Lo siento, hubo un error procesando tu consulta. Por favor intenta de nuevo.';
  }
}
