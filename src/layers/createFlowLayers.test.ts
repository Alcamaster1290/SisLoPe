import { describe, expect, it } from "vitest";
import {
  getFlowModeZoomCalibration,
  getFlowViewProfile,
  getFlowZoomProfile,
} from "@/layers/createFlowLayers";

describe("flow zoom profile", () => {
  it("uses lower visual intensity at low zoom", () => {
    const profile = getFlowZoomProfile(4.8);
    expect(profile.widthScale).toBeLessThan(0.9);
    expect(profile.corridorAlpha).toBeLessThan(0.62);
    expect(profile.tripAlpha).toBeLessThan(0.72);
  });

  it("increases width and opacity as zoom increases", () => {
    const low = getFlowZoomProfile(5.2);
    const mid = getFlowZoomProfile(6.6);
    const high = getFlowZoomProfile(8.3);

    expect(mid.widthScale).toBeGreaterThan(low.widthScale);
    expect(high.widthScale).toBeGreaterThan(mid.widthScale);
    expect(mid.corridorAlpha).toBeGreaterThan(low.corridorAlpha);
    expect(high.tripAlpha).toBeGreaterThan(mid.tripAlpha);
  });

  it("flattens flow arcs progressively at higher zoom", () => {
    const low = getFlowZoomProfile(5.4);
    const mid = getFlowZoomProfile(6.8);
    const high = getFlowZoomProfile(8.5);

    expect(low.arcHeightScale).toBeGreaterThan(mid.arcHeightScale);
    expect(mid.arcHeightScale).toBeGreaterThan(high.arcHeightScale);
  });

  it("changes smoothly around transition bands", () => {
    const beforeLowBand = getFlowZoomProfile(6.19);
    const afterLowBand = getFlowZoomProfile(6.21);
    const beforeHighBand = getFlowZoomProfile(7.79);
    const afterHighBand = getFlowZoomProfile(7.81);

    expect(Math.abs(beforeLowBand.widthScale - afterLowBand.widthScale)).toBeLessThan(0.02);
    expect(Math.abs(beforeLowBand.corridorAlpha - afterLowBand.corridorAlpha)).toBeLessThan(0.03);
    expect(Math.abs(beforeHighBand.widthScale - afterHighBand.widthScale)).toBeLessThan(0.02);
    expect(Math.abs(beforeHighBand.tripAlpha - afterHighBand.tripAlpha)).toBeLessThan(0.03);
  });

  it("keeps standard and 3d emphasis subtler than dedicated flow mode", () => {
    const standard = getFlowViewProfile("standard");
    const emphasis3d = getFlowViewProfile("emphasis3d");
    const flows = getFlowViewProfile("flows");

    expect(emphasis3d.arcOpacity).toBe(0);
    expect(standard.arcOpacity).toBe(0);
    expect(flows.arcOpacity).toBeGreaterThan(0.8);
    expect(flows.tripBoost).toBeGreaterThan(standard.tripBoost);
    expect(flows.tripBoost).toBeGreaterThan(emphasis3d.tripBoost);
    expect(emphasis3d.corridorBoost).toBeLessThan(standard.corridorBoost);
  });

  it("applies mode+zoom calibration to keep flows readable", () => {
    const lowFlows = getFlowModeZoomCalibration("flows", 5);
    const highFlows = getFlowModeZoomCalibration("flows", 8.4);
    const lowEmphasis = getFlowModeZoomCalibration("emphasis3d", 5);
    const highStandard = getFlowModeZoomCalibration("standard", 8.4);

    expect(highFlows.tripAlphaBoost).toBeGreaterThan(lowFlows.tripAlphaBoost);
    expect(highFlows.trailBoost).toBeGreaterThan(lowFlows.trailBoost);
    expect(lowEmphasis.widthBoost).toBeLessThan(1);
    expect(highStandard.arcHeightBoost).toBeLessThan(1);
  });

  it("keeps calibration continuous around the cluster transition band", () => {
    const flowsBefore = getFlowModeZoomCalibration("flows", 5.59);
    const flowsAfter = getFlowModeZoomCalibration("flows", 5.61);
    const emphasisBefore = getFlowModeZoomCalibration("emphasis3d", 5.59);
    const emphasisAfter = getFlowModeZoomCalibration("emphasis3d", 5.61);

    expect(Math.abs(flowsBefore.widthBoost - flowsAfter.widthBoost)).toBeLessThan(0.04);
    expect(Math.abs(flowsBefore.corridorAlphaBoost - flowsAfter.corridorAlphaBoost)).toBeLessThan(0.05);
    expect(Math.abs(flowsBefore.tripAlphaBoost - flowsAfter.tripAlphaBoost)).toBeLessThan(0.05);
    expect(Math.abs(emphasisBefore.widthBoost - emphasisAfter.widthBoost)).toBeLessThan(0.04);
    expect(Math.abs(emphasisBefore.tripAlphaBoost - emphasisAfter.tripAlphaBoost)).toBeLessThan(0.05);
  });
});
