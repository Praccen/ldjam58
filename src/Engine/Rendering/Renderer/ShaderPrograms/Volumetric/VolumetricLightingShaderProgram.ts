import {
  pointLightsToAllocate,
  pointShadowsToAllocate,
} from "../../RendererBase";
import { screenQuadVertexSrc } from "../ScreenQuadShaderProgram";
import ShaderProgram from "../ShaderProgram";

function getFragSrc() {
  let volumetricLightingFragmentShaderSrc =
    `#version 300 es
  precision highp float;

  #define NR_POINT_LIGHTS ` +
    pointLightsToAllocate +
    `
  #define NR_POINT_SHADOWS ` +
    pointShadowsToAllocate +
    `
  in vec2 texCoords;

  uniform mat4 viewProjMatrix;
  uniform vec3 cameraPos;
  uniform float fogMaxDistance;
  uniform float fogDensity;

  uniform sampler2D gPosition;
  uniform sampler2D fogMap;
  uniform sampler2D depthMap;
  uniform samplerCube pointDepthMaps[NR_POINT_SHADOWS];

  struct PointLight {
    vec3 position;
    vec3 colour;

    float constant;
    float linear;
    float quadratic;

    int pointDepthMapIndex;
  };

  struct DirectionalLight {
    vec3 direction;
    vec3 colour;
    float ambientMultiplier;
  };

  uniform DirectionalLight directionalLight;
  uniform mat4 lightSpaceMatrix;
  uniform PointLight pointLights[NR_POINT_LIGHTS];
  uniform int nrOfPointLights;
  uniform float currentTime;

  out vec4 FragColor;
  const float far_plane = 100.0;

  const float scattering = 0.0;
  const float steps = 10.0;

  const mat4 offsetMatrix = mat4(
    0.0f, 0.5f, 0.125f, 0.625f,
    0.75f, 0.22f, 0.875f, 0.375f,
    0.1875f, 0.6875f, 0.0625f, 0.5625,
    0.9375f, 0.4375f, 0.8125f, 0.3125
  );

  float ComputeScattering(float lightDotView)
  {
    float result = 1.0 - scattering * scattering;
    result /= (4.0 * 3.1415 * pow(1.0 + scattering * scattering - (2.0 * scattering) * lightDotView, 1.5));
    return result;
  }


  float CalcPointShadow(PointLight light, vec3 fragmentPos) {
    // get vector between fragment position and light position
      vec3 fragToLight = fragmentPos - light.position;
    fragToLight.y *= -1.0;
    fragToLight.z *= -1.0;
      // use the light to fragment vector to sample from the depth map
      float closestDepth = 1.0;`;
  // Below is ugly, but I have to unroll the loop to be able to acces the pointDepthMaps array with a compile time index, as run-time index is not allowed to access a sampler
  for (let i = 0; i < pointShadowsToAllocate; i++) {
    if (i == 0) {
      volumetricLightingFragmentShaderSrc +=
        `
    if (light.pointDepthMapIndex == ` +
        i +
        `) {
      closestDepth = texture(pointDepthMaps[` +
        i +
        `], fragToLight).r;
    }
    `;
    } else {
      volumetricLightingFragmentShaderSrc +=
        `
    else if (light.pointDepthMapIndex == ` +
        i +
        `) {
      closestDepth = texture(pointDepthMaps[` +
        i +
        `], fragToLight).r;
    }
    `;
    }
  }

  volumetricLightingFragmentShaderSrc += `
      // it is currently in linear range between [0,1]. Re-transform back to original value
      closestDepth *= far_plane;
      // now get current linear depth as the length between the fragment and light position
      float currentDepth = length(fragToLight);
      // now test for shadows
      float shadow = currentDepth > closestDepth ? 1.0 : 0.0;

      return shadow;
  }

  // Calculates the colour when using a point light.
  vec4 CalcPointLight(PointLight light, vec3 fragmentPos, vec3 rayDir) {
    float shadow = 0.0;
    if (light.pointDepthMapIndex >= 0 && light.pointDepthMapIndex < NR_POINT_SHADOWS) {
      shadow = CalcPointShadow(light, fragmentPos);
    }

    if (shadow == 0.0) {
      float distance = length(light.position - fragmentPos);
      float attenuation = 1.0f / (light.constant + light.linear * distance + light.quadratic * (distance * distance));

      return vec4(light.colour * attenuation * ComputeScattering(dot(normalize(light.position - fragmentPos), rayDir)), 1.0); 
    }
    return vec4(0.0, 0.0, 0.0, 0.0);
  }

  float CalcShadow(vec4 lightSpaceFragPos) {
    // perform perspective divide
      vec3 projCoords = lightSpaceFragPos.xyz / lightSpaceFragPos.w;

      // transform to [0,1] range
      projCoords = projCoords * 0.5 + 0.5;

    if (projCoords.z > 1.0) {
      return 0.0;
    }

      // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
      float closestDepth = texture(depthMap, projCoords.xy).r; 

      // get depth of current fragment from light's perspective
      float currentDepth = projCoords.z;

      // check whether current frag pos is in shadow	
    float shadow = 0.0;
    ivec2 textureSize = textureSize(depthMap, 0);
    vec2 texelSize = vec2(1.0 / float(textureSize.x), 1.0 / float(textureSize.y));
    for(int x = -1; x <= 1; ++x)
    {
      for(int y = -1; y <= 1; ++y)
      {
        float pcfDepth = texture(depthMap, projCoords.xy + vec2(x, y) * texelSize).r; 
        shadow += currentDepth > pcfDepth ? 1.0 : 0.0;
      }    
    }
    shadow = shadow / 9.0;

      return shadow;
  }

  vec4 CalcDirectionalLight(DirectionalLight light, vec4 lightSpaceFragPos, vec3 rayDir) {
    float shadow = CalcShadow(lightSpaceFragPos);
    return vec4(light.colour * (1.0 - shadow) * ComputeScattering(dot(light.direction, rayDir)), 1.0); 
  }

  void main()
  {
      vec4 result = vec4(0.0, 0.0, 0.0, 0.0);

    vec3 fragPos = vec3(0.0, 0.0, 0.0);
    vec4 gPosValues = texture(gPosition, texCoords);

    if (gPosValues.a < 0.01) {
      //discard;
      vec4 clipSpacePos = inverse(viewProjMatrix) * vec4(texCoords.xy * 2.0 - vec2(1.0, 1.0), 1.0, 1.0);
      vec3 worldPos = vec3(clipSpacePos.xyz / clipSpacePos.w);
      fragPos = cameraPos + normalize(worldPos - cameraPos) * fogMaxDistance;
    }
    else {
      fragPos.rgb = gPosValues.rgb;
    }

    vec3 dir = fragPos - cameraPos;
    float maxDistance = min(length(dir), fogMaxDistance);
    dir = normalize(dir);

    vec3 stepOffset = dir * (maxDistance / steps);
    vec3 startPos = cameraPos + stepOffset * offsetMatrix[int(floor(mod(gl_FragCoord.x, 4.0)))][int(floor(mod(gl_FragCoord.y, 4.0)))];

    for (float step = 0.0; step < steps; step += 1.0) {
      vec4 tempResult;
      float effectedCounter = 0.0;
      vec3 pos = startPos + stepOffset * step;
      float fogMultiplier = 0.3 + texture(fogMap, vec2(pos[0] * 0.05 + currentTime * 0.02, pos[2] * 0.05)).r * texture(fogMap, vec2(pos[0] * 0.05 + currentTime * 0.02, pos[1] * 0.05 + currentTime * 0.01)).r * texture(fogMap, vec2(pos[2] * 0.05, pos[1] * 0.05 + currentTime * 0.01)).r * 1.4;
      // float fogMultiplier = 1.0;
      vec4 lightSpaceFragPos = (lightSpaceMatrix * vec4(pos, 1.0f));
      vec4 dirLightResult = CalcDirectionalLight(directionalLight, lightSpaceFragPos, dir);
      if (dirLightResult.a > 0.0) {
        effectedCounter += 0.7;
        tempResult += dirLightResult * fogMultiplier * 2.0;
      }

      for (int i = 0; i < nrOfPointLights; i++) {
        vec4 lightResult = CalcPointLight(pointLights[i], pos, dir);
        if (lightResult.a > 0.0) {
          effectedCounter += 1.0;
          tempResult += lightResult * fogMultiplier * 2.5;
        }
      }

      tempResult /= min(effectedCounter, 1.0);
      result += tempResult;
    }
    // result = (result/steps) * fogDensity;
    result.a = (result.a / steps) * fogDensity;
    FragColor = result;

    // FragColor = vec4(1.0, 1.0, 1.0, maxDistance / fogMaxDistance);
  }
  `;

  return volumetricLightingFragmentShaderSrc;
}

export default class VolumetricLightingShaderProgram extends ShaderProgram {
  constructor(gl: WebGL2RenderingContext) {
    super(
      gl,
      "VolumetricLightingShaderProgram",
      screenQuadVertexSrc,
      getFragSrc(),
      false
    );

    this.use();

    this.setUniformLocation("viewProjMatrix");
    this.setUniformLocation("cameraPos");
    this.setUniformLocation("fogMaxDistance");
    this.setUniformLocation("fogDensity");
    this.setUniformLocation("gPosition");
    this.setUniformLocation("depthMap");
    this.setUniformLocation("fogMap");

    this.gl.uniform1i(this.getUniformLocation("gPosition")[0], 0);
    this.gl.uniform1i(this.getUniformLocation("fogMap")[0], 1);
    this.gl.uniform1i(this.getUniformLocation("depthMap")[0], 2);

    this.setUniformLocation("nrOfPointLights");
    this.setUniformLocation("currentTime");

    for (let i = 0; i < pointShadowsToAllocate; i++) {
      this.setUniformLocation("pointDepthMaps[" + i + "]");
      this.gl.uniform1i(
        this.getUniformLocation("pointDepthMaps[" + i + "]")[0],
        i + 3
      );
    }

    for (let i = 0; i < pointLightsToAllocate; i++) {
      this.setUniformLocation("pointLights[" + i + "].position");
      this.setUniformLocation("pointLights[" + i + "].colour");

      this.setUniformLocation("pointLights[" + i + "].constant");
      this.setUniformLocation("pointLights[" + i + "].linear");
      this.setUniformLocation("pointLights[" + i + "].quadratic");

      this.setUniformLocation("pointLights[" + i + "].pointDepthMapIndex");
    }

    this.setUniformLocation("directionalLight.direction");
    this.setUniformLocation("directionalLight.colour");
    this.setUniformLocation("directionalLight.ambientMultiplier");
    this.setUniformLocation("lightSpaceMatrix");
  }
}
