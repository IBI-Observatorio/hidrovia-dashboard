"use client";

// CollisionChart — Colisão Safra × Calado do Arco Norte (PASSO 7, DADO REAL).
// Duas curvas: embarque programado (line-ups CDP/SCAP, mil t/sem) × dias até
// o CMR do canal Tabocal cair abaixo de 11 m (projetaCruzamentoCalado de
// lib/recessao-itacoatiara.ts — NUNCA recalculado aqui).
// Faixa OURO onde zonaColisao=true; sem zona = notícia boa em ibi-green.
// Cores: apenas hex dos tokens do globals.css (recharts exige cor literal).

import { motion } from "framer-motion";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, Legend,
} from "recharts";
import { agroCopy } from "@/lib/agro-copy";
import type { ColisaoData } from "@/lib/agro-content";

const COR_EMBARQUE = "#0099d8";
const COR_CALADO = "#00a652";
const COR_JANELA = "#D4922A";

export default function CollisionChart({ colisao }: { colisao: ColisaoData }) {
  const copy = agroCopy.colisao;

  if (colisao.status !== "ok" || !colisao.pontos.length) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-azul-medio p-6"
      >
        <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ouro">{copy.eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold text-white">{copy.titulo}</h2>
        <p className="mt-3 text-sm text-gray-400">{copy.indisponivel}</p>
      </motion.section>
    );
  }

  const dados = colisao.pontos.map((p) => ({
    semana: p.semana,
    embarque: p.embarqueProgramadoMilT,
    dias: p.diasAteCaladoCritico,
  }));
  const temZona = colisao.zona.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-azul-medio"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-ibi-green to-ibi-blue" />
      <div className="p-6">
        <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ouro">{copy.eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold text-white">{copy.titulo}</h2>
        <p className="mt-1 max-w-[680px] text-sm leading-relaxed text-gray-400">{copy.subtitulo}</p>

        {/* veredito da janela — zona em ouro ou notícia boa em verde */}
        {temZona ? (
          <p className="mt-3 inline-block rounded-md border border-ouro/30 bg-ouro/10 px-3 py-1.5 text-[0.78rem] font-semibold text-ouro">
            {copy.labelZona} · {colisao.zona.join(", ")}
          </p>
        ) : (
          <p className="mt-3 inline-block rounded-md border border-ibi-green/30 bg-ibi-green/10 px-3 py-1.5 text-[0.78rem] font-semibold text-ibi-green">
            {copy.semColisao}
          </p>
        )}

        <div className="mt-5 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="semana" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="emb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="cal" orientation="right" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {temZona && (
                <ReferenceArea
                  yAxisId="emb"
                  x1={colisao.zona[0]}
                  x2={colisao.zona[colisao.zona.length - 1]}
                  fill={COR_JANELA}
                  fillOpacity={0.15}
                  stroke={COR_JANELA}
                  strokeOpacity={0.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `${copy.labelZonaFlutuante} · ${colisao.zona[0]}`,
                    position: "insideTop", fill: COR_JANELA, fontSize: 11,
                  }}
                />
              )}
              <Line yAxisId="emb" type="monotone" dataKey="embarque" name={copy.serieEmbarque}
                stroke={COR_EMBARQUE} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              <Line yAxisId="cal" type="monotone" dataKey="dias" name={copy.serieCalado}
                stroke={COR_CALADO} strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-2 text-[0.7rem] leading-relaxed text-gray-500">
          {copy.notaAgenda.replace("{n}", String(colisao.semanasComAgenda))}
        </p>
        <p className="mt-1.5 border-t border-white/10 pt-2 text-[0.66rem] leading-relaxed text-gray-500">
          {copy.rodapeFontes}
        </p>
      </div>
    </motion.section>
  );
}
