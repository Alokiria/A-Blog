---
title: '第十章 高级纹理'
date: 2026-10-04
updated: 2026-10-04
categories: UnityShader入门精要-URP改编
cover: https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/o_251204051842_bg-blog1.jpg
tags:
  - Shaderlab
  - TA
  - 图形学
top: 1
---

在第七章，我们学习了关于基础纹理的内容，这些纹理包括法线纹理、渐变纹理、遮罩纹理等。这些纹理尽管用处不同，但他们都属于低维纹理（一维或二维）纹理。在本章中，我们将学习一些更复杂的纹理：立方体纹理（Cubemap）、渲染纹理（Render Texture）、程序纹理（Procedure Texture）。

# 立方体纹理
在图形学中，**立方体纹理（Cubemap）** 是**环境映射（Environment Mapping）** 的一种实现方法。环境映射可以模拟物体周围的环境，而使用了环境映射的物体可以看起来像镀了层金属一样反映出周围的环境。

和之前见到的纹理不同，立方体纹理一共包含了 6 张图像，这些图像对应了一个立方体的 6 个面，立方体纹理的名称也由此而来。立方体的每个面表示沿着世界空间下的轴向（上下左右前后）观察所得的图像。那么，我们如何对这样的一种纹理进行采样呢？和之前使用二维纹理坐标不同，对立方体纹理采样我们需要提供一个三维的纹理坐标，这个三维纹理坐标表示了我们在世界空间下的一个3D方向。这个方向矢量从立方体的中心出发，当它向外部延伸时就会和立方体的6个纹理之一发生相交，而采样得到的结果就是由该交点计算而来的。下图给出了使用方向向量对立方体纹理采样的过程。

<!-- 这是一张图片，ocr 内容为： -->
![对立方体纹理进行采样](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781491416563-fb19558f-0a57-47ce-9dd7-26d014daae54.png)

:::info
小贴士：

+ 绝对值最大的分量决定采样面
+ 另外两个决定在这个面上的采样坐标

:::

使用立方体纹理的好处在于，它的实现简单快速，而且得到的效果也比较好。但它也有一些缺点，例如当场景中引入了新的物体、光源，或者物体发生移动时，我们就需要重新生成立方体纹理。除此之外，立方体纹理也仅可以反射环境，但不能反射使用了该立方体纹理的物体。这是因为，立方体纹理不能模拟多次反射的结果，例如两个金属球互相反射的情况。由于这样的原因，想要得到令人信服的渲染结果，我们应该尽量对凸面体而不要对凹面体使用立方体纹理（因为凹面体会反射自身）

立方体纹理在实时渲染中有很多应用，最常见的是用于天空盒子（Skybox）以及环境映射。

## 天空盒子
天空盒子（Skybox）是游戏中用于模拟背景的一种方法。天空盒子这个名字包含了两个信息：它是用来模拟天空的（尽管现在我们仍可以用它模拟室内等背景），它是一个盒子。当我们在场景中使用了天空盒子时，整个场景就被包围在一个立方体内。这个立方体的每个面使用的技术就是立方体纹理映射技术。

在Unity中，想要使用天空盒子非常简单。我们只需要创建一个Skybox材质，再把它赋给该场景的相关设置即可。

新建一个材质，在Shader选择中选择Skybox分类下的6 Sided

<!-- 这是一张图片，ocr 内容为： -->
![Skybox](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781492690077-0ec8b35e-5fa2-4817-8570-c7391e701068.png)<!-- 这是一张图片，ocr 内容为： -->
![6 Sided](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781492726616-618a67fc-5429-4780-b552-21a38ae5bfc0.png)

然后使用本书资源中的 Assets/Texture/Chapter10/Cubemaps 文件夹下的 6 张纹理对材质进行赋值，注意这两张纹理的正确位置（如posz纹理对应了Front[+Z]属性）。为了让天空盒子正常渲染，我们需要把6张纹理的Wrap Mode设置为**Clamp**，以防止在接缝处出现不匹配的现象。

<!-- 这是一张图片，ocr 内容为： -->
![配置纹理](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781493354108-a3c6d2d1-5da9-475f-81c3-43097cde8c1a.png)

上面的材质中，除了 6 张纹理属性外还有 3 个属性：Tint Color，用于控制该材质的整体颜色；Exposure，用于调整天空盒子的亮度；Rotation，用于调整天空盒子沿+y轴方向的旋转角度。

下面，我们来看一下如何为场景添加Skybox。

新建一个场景，在`Window -> Rendering -> Lighting -> Environment -> Skybox Material`中，把我们创建的Skybox赋值给它。如下图所示：

<!-- 这是一张图片，ocr 内容为： -->
![赋予天空盒子](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781493581825-8a006ad4-dad8-488b-9056-47d61bbe4180.png)

为了让摄像机正常显示天空盒子，我们还需要保证渲染场景的摄像机的camera组件中的Environment -> Background Type 设置为Skybox。

<!-- 这是一张图片，ocr 内容为： -->
![设置Background Type](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781493682008-1fc33159-c761-4e9d-b149-f8cd67062ad0.png)

这样，我们得到的场景如下图：

<!-- 这是一张图片，ocr 内容为： -->
![使用了天空盒子的场景](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781493755610-2b632b28-4ac2-466c-92d0-0cd82ad191a9.png)

需要注意的是，在`Skybox Material`中设置的天空盒子会应用于该场景的所有摄像机，如果我们希望某些摄像机可以使用不同的天空盒子，可以通过向该摄像机添加Skybox组件来覆盖掉之前的设置。也就是说，我们可以在摄像机中单击 Component -> Rendering -> Skybox 来完成对场景默认天空盒子的覆盖

<!-- 这是一张图片，ocr 内容为： -->
![单独设置天空盒子](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781493967102-fe7e4d3f-37df-4252-bca2-f89c2b08a4ca.png)

在Unity中，天空盒子是在所有不透明物体之后渲染，而其背后使用的网格是一个立方体或一个细分后的球体。

## 环境映射
除了天空盒子，立方体纹理最常见的用处是用于环境映射，通过这种方法，我们可以模拟出金属质感的材质。

创建用于环境映射的立方体纹理的常见的方法有四种：第一种是直接由一些特殊布局的纹理创建；第二种方法是手动创建一个Cubemap资源，再把 6 张图赋给它；第三种方法是由脚本生成；第四种是使用反射探针生成。

如果使用第一种方法，我们需要提供一张具有特殊布局的纹理，例如类似于立方体展开图的交叉布局、全景布局。然后，我们只需要把该纹理的**Texture Type** 设置为**Cubemap** 即可，Unity会为我们做好剩下的事情。在基于物理的渲染（PBR）中，我们通常会使用一张HDR图像来生成高质量Cubemap（详见18章）。

第二种方法是老版本中使用的方法。我们首先需要在项目资源中创建一个Cubemap，然后把6张纹理拖拽到它的面板中。新版本中推荐使用第一种方法创建立方体纹理，这是因为第一种方法可以对纹理数据进行压缩，而且可以支持边缘修正、光华反射和HDR等功能。

前面两种方法都需要我们提前准备好立方体纹理的图像，它们得到的立方体纹理往往是被场景中的物体所共用的。但在理想情况下，我们希望根据物体在场景中位置的不同，生成它们各自不同的立方体纹理。这时，我们就可以在Unity中使用脚本来创建。这是通过利用Unity提供的`Camera.RenderToCubemap`函数来实现的。`Camera.RenderToCubemap`函数可以把任意位置观察到的场景图像存储到 6 张图像中，从而创建出该位对应的立方体纹理。

在Unity的[脚本手册](https://docs.unity.cn/cn/2019.4/ScriptReference/Camera.RenderToCubemap.html)中给出了如何使用`Camera.RenderToCubemap`函数来创建立方体纹理的代码：

```shaderlab
using UnityEngine;
using UnityEditor;
using System.Collections;

public class RenderCubemapWizard : ScriptableWizard {
	
    public Transform renderFromPosition;
    public Cubemap cubemap;
	
    void OnWizardUpdate () {
        helpString = "Select transform to render from and cubemap to render into";
        isValid = (renderFromPosition != null) && (cubemap != null);
    }
	
    void OnWizardCreate()
    {
        // create temporary camera for rendering
        GameObject go = new GameObject("CubemapCamera");
        go.AddComponent<Camera>();
        // place it on the object
        go.transform.position = renderFromPosition.position;
        go.transform.rotation = Quaternion.identity;
        // render into cubemap
        go.GetComponent<Camera>().RenderToCubemap(cubemap);

        // destroy temporary camera
        DestroyImmediate(go);
    }
	
    [MenuItem("GameObject/Render into Cubemap")]
    static void RenderCubemap () {
        ScriptableWizard.DisplayWizard<RenderCubemapWizard>(
            "Render cubemap", "Render!");
    }
}
```

其中`OnWizardCreate`方法是关键，我们在`renderFromPosition`（由用户指定）位置出创建一个摄像机，并调用`Camera.RenderToCubemap`函数把从当前位置观察到的图像渲染到用户指定的立方体纹理cubemap中，完成后再销毁临时摄像机。在文件夹中创建一个c#文件，把以上代码写进去即可。这时候会在GameObject菜单栏下会出现Render into Cubemap，这个就是用来渲染立方体纹理用的。

<!-- 这是一张图片，ocr 内容为： -->
![Render into Cubemap位置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781508817601-28e7c84e-0c39-4705-9eec-815894f61642.png)

我们先创建一个空的 GameObject 对象，我们会使用该GameObject的位置信息来渲染立方体纹理。

<!-- 这是一张图片，ocr 内容为： -->
![空的GameObject对象](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781508938838-34e343c6-b0fc-449d-9296-339e547ac82c.png)

新建一个用于存储的立方体纹理（在Project视图下右键，选择Create -> Legacy -> Cubumap来创建）。为了让脚本可以顺利将图像渲染到该立方体纹理中，我们需要在它的面板中勾选**Readable** 选项。

然后打开Render into Cubemap，把创建的空对象和Cubemap拖进去：

<!-- 这是一张图片，ocr 内容为： -->
![Render cubemap](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781571184396-650b6516-6119-409a-bcb0-189eeb1ee1a8.png)

点击窗口中的**Render！** 然后就可以得到渲染后的立方体纹理，

<!-- 这是一张图片，ocr 内容为： -->
![渲染后的立方体纹理](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781571498656-ddba687c-4482-479a-88c0-a27e8a5f2b23.png)

需要注意的是，我们需要为Cubemap设置大小，即上图中的Face size选项，Face size值越大，渲染出来的立方体纹理分辨率越大，效果可能更好，但需要占用的内存也越大，这可以由面板最下方显示的内存大小得到。

还有一种更快捷的方法渲染立方体纹理，就是使用反射探针。我们在场景中创建一个反射探针（Light -> Reflection Probe）

<!-- 这是一张图片，ocr 内容为： -->
![创建反射探针](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781571602985-8698541e-2bd1-492a-841d-72da8c831234.png)

我们选中Baked模式，直接点击最下面的Bake

<!-- 这是一张图片，ocr 内容为： -->
![反射探针](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781571868356-490c9367-cedd-4815-a0e5-748d7e40173a.png)

我们就可以在场景路径下的一个同名文件夹中找到一个渲染好的立方体纹理，这里渲染出来的是新版的Cubemap的形式，可以看到面板与之前丰富了很多。

<!-- 这是一张图片，ocr 内容为： -->
![反射探针渲染](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781571941458-e7be8faa-ce08-48f1-8b55-15df999e0ddc.png)

准备好了立方体纹理后，我们就可以对物体使用环境映射技术。而环境映射最常见的应用就是反射和折射。

### 反射
想要模拟反射效果很简单，我们只需要通过视角方向和表面法线方向来计算入射光线方向，再利用入射光线对立方体纹理采样即可。

在场景中拖拽一个 Teapot 模型，并调整它的位置与上面我们渲染立方体纹理的对象的位置相同。然后我们新建shader和材质开始准备写代码。

首先，我们声明一些属性，这次我对代码都进行了一些重新排版，以及换成了中文信息。

```shaderlab
Properties
{
    // 材质信息
    [Header(Texture)] [Space(5)]
    _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

    // 基础材质属性
    [Header(Texture Properties)] [Space(5)]
    _BaseColor ("基础颜色", Color) = (1, 1, 1)

    // 反射相关
    [Header(Reflection)] [Space(5)]
    _ReflectColor ("反射颜色", Color) = (1, 1, 1)
    _ReflectIntensity ("反射强度", Range(0, 1)) = 1

    // 控制信息
    [Header(Control Info)] [Space(5)]
    [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
}
```

其中，`_ReflectColor`用于控制反射颜色，`_ReflectIntensity`用于控制这个材质的反射程度，而`_Cubemap`就是用于模拟反射的环境映射纹理，需要注意的是这里的类型不再是2D，而是Cube，包括在下文声明向量的时候也是。

```shaderlab
TEXTURECUBE(_Cubemap);
SAMPLER(sampler_Cubemap);
```

我们在顶点着色器中，计算了该顶点的视角反射方向，通过`reflect`函数来实现的

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionCS = positionInputs.positionCS;
    OUT.positionWS = positionInputs.positionWS;
    VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
    OUT.normalWS = normalInputs.normalWS;

    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(OUT.positionWS);
    OUT.reflectLightDirWS = reflect(-viewDirWS, OUT.normalWS);
    OUT.shadowCoord = GetShadowCoord(positionInputs);
    return OUT;
}
```

物体反射到摄像机中的光线方向，可以由光路可逆的原则来反向得到。也就是说，我们可以计算视角方向关于顶点法线的反射方向来求得入射光线的方向。

在片元着色器中，利用反射方向来对立方体纹理进行采样：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    // 基础向量
    Light mainLight = GetMainLight(IN.shadowCoord);
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);

    // 纹理采样
    half4 cubemap = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, IN.reflectLightDirWS);

    // 光照计算
    half3 albedo = _BaseColor;
    half lambert = dot(lightDirWS, normalWS);
    half3 diffuse = mainLight.color * albedo * saturate(lambert);
    half3 reflection = cubemap.rgb * _ReflectColor;

    half3 finalColor = lerp(diffuse, reflection, _ReflectIntensity) * mainLight.shadowAttenuation;
    return half4(finalColor, 1);
}
```

对立方体纹理的采样需要使用`SAMPLE_TEXTURECUBE`函数。注意到，在上面的计算中，我们在采样时并没有对`IN.reflectLightDirWS`进行归一操作，这是因为，用于采样的参数仅仅是作为方向变量传递给`SAMPLE_TEXTURECUBE`函数，因此我们没有必要进行一次归一操作。然后我们使用`_ReflectIntensity`混合漫反射颜色和反射颜色，并和环境光照相加后返回。

在上面的计算中，我们选择在顶点着色器中计算反射方向，当然，我们也可以选择在片元着色器中计算，这样得到的效果更加细腻。但对于绝大多数人来说，这种差别是可以忽略不计的，因此出于性能考虑，我们选择在顶点着色器中计算反射方向。

完整代码：

```shaderlab
Shader "Unlit/Reflection"
{
    Properties
    {
        // 材质信息
        [Header(Texture)] [Space(5)]
        _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

        // 基础材质属性
        [Header(Texture Properties)] [Space(5)]
        _BaseColor ("基础颜色", Color) = (1, 1, 1)
        
        // 反射相关
        [Header(Reflection)] [Space(5)]
        _ReflectColor ("反射颜色", Color) = (1, 1, 1)
        _ReflectIntensity ("反射强度", Range(0, 1)) = 1
          
        // 控制信息
        [Header(Control Info)] [Space(5)]
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"  
        }
        HLSLINCLUDE
        
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
      
        TEXTURECUBE(_Cubemap);
        SAMPLER(sampler_Cubemap);
      
        CBUFFER_START(UnityPerMaterial)
        // texture_ST
        float4 _Cubemap_ST;

        // 基础材质属性
        half3 _BaseColor;
        
        // 反射相关
        half3 _ReflectColor;
        half _ReflectIntensity;
      
        CBUFFER_END
        ENDHLSL
        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            HLSLPROGRAM
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile_fragment _SHADOWS_SOFT

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float3 reflectLightDirWS : TEXCOORD2;
                float4 shadowCoord : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(OUT.positionWS);
                OUT.reflectLightDirWS = reflect(-viewDirWS, OUT.normalWS);
                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                // 基础向量
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                
                // 纹理采样
                half4 cubemap = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, IN.reflectLightDirWS);
                
                // 光照计算
                half3 albedo = _BaseColor;
                half lambert = dot(lightDirWS, normalWS);
                half3 diffuse = mainLight.color * albedo * saturate(lambert);
                half3 reflection = cubemap.rgb * _ReflectColor;
                
                half3 finalColor = lerp(diffuse, reflection, _ReflectIntensity) * mainLight.shadowAttenuation;
                return half4(finalColor, 1);
            }
            
            ENDHLSL
        }
        Pass
        {
            Tags
            {
                "LightMode" = "ShadowCaster"
            }

            ZWrite On
            ZTest LEqual
            ColorMask 0
            Cull [_Cull]
            HLSLPROGRAM
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _CASTING_PUNCTUAL_LIGHT_SHADOW

            #pragma vertex ShadowVert
            #pragma fragment ShadowFrag

            float3 _LightDirection;
            float3 _LightPosition;

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            Varyings ShadowVert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                float3 positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                float3 normalWS = normalInputs.normalWS;

                #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                float3 lightDirWS = normalize(_LightPosition - positionWS);
                #else
                float3 lightDirWS = _LightDirection;
                #endif

                float4 positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, lightDirWS));

                #if UNITY_REVERSED_Z
                positionCS.z = min(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #else
                positionCS.z = max(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                OUT.positionCS = positionCS;
                return OUT;
            }

            half4 ShadowFrag(Varyings IN) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
    }
}

```

使用了反射效果的物体看起来就像镀了层金属。

<!-- 这是一张图片，ocr 内容为： -->
![反射效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781574235115-4de126fc-2dc5-4d28-b286-d260240196cf.png)

不过，这种使用代码生成的Cubemap没法开启Mipmap，如果使用的是反射弹奏得到的Cubemap，你是可以通过调整它的Mipmap来更改反射效果，Mip越高，效果越粗糙。

<!-- 这是一张图片，ocr 内容为： -->
![Mip：0](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781575029014-ba3def99-a7c9-4443-bae6-0642c4bf3517.png)<!-- 这是一张图片，ocr 内容为： -->
![Mip：3](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781575049862-6035a586-8842-447c-8b89-1ea3083d1eb3.png)

前提是需要把**Convolution Type** 设置为**Specular**，不过反射探针渲染出来的自动选用了Specular。

<!-- 这是一张图片，ocr 内容为： -->
![Convolution Type设置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781575125917-ef1b056d-252f-4283-ba85-68d15db00909.png)

我们只需要添加一个新的变量`_MipLevel`用于控制Mip等级即可：

```shaderlab
Properties
{
    // 材质信息
    [Header(Texture)] [Space(5)]
    _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

    // 基础材质属性
    [Header(Texture Properties)] [Space(5)]
    _BaseColor ("基础颜色", Color) = (1, 1, 1)

        // 反射相关
        [Header(Reflection)] [Space(5)]
    _ReflectColor ("反射颜色", Color) = (1, 1, 1)
    _ReflectIntensity ("反射强度", Range(0, 1)) = 1
    _MipLevel ("Mip等级", Range(0, 7)) = 0  // 新增

        // 控制信息
    [Header(Control Info)] [Space(5)]
    [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
}
```

然后在片元着色器中采样立方体的时候应用上：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    // 基础向量
    Light mainLight = GetMainLight(IN.shadowCoord);
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);

    // 纹理采样
    half4 cubemap = SAMPLE_TEXTURECUBE_LOD(_Cubemap, sampler_Cubemap, IN.reflectLightDirWS, _MipLevel);

    // 光照计算
    half3 albedo = _BaseColor;
    half lambert = dot(lightDirWS, normalWS);
    half3 diffuse = mainLight.color * albedo * saturate(lambert);
    half3 reflection = cubemap.rgb * _ReflectColor;

    half3 finalColor = lerp(diffuse, reflection, _ReflectIntensity) * mainLight.shadowAttenuation;
    return half4(finalColor, 1);
}
```

这里我们对立方体纹理的采样函数换成了`SAMPLE_TEXTURECUBE_LOD`，这个函数可以传入`_MipLevel`去调整Cubemap的Mip等级。

完整代码：

```shaderlab
Shader "Unlit/Reflection"
{
    Properties
    {
        // 材质信息
        [Header(Texture)] [Space(5)]
        _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

        // 基础材质属性
        [Header(Texture Properties)] [Space(5)]
        _BaseColor ("基础颜色", Color) = (1, 1, 1)
        
        // 反射相关
        [Header(Reflection)] [Space(5)]
        _ReflectColor ("反射颜色", Color) = (1, 1, 1)
        _ReflectIntensity ("反射强度", Range(0, 1)) = 1
        _MipLevel ("Mip等级", Range(0, 7)) = 0
          
        // 控制信息
        [Header(Control Info)] [Space(5)]
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"  
        }
        HLSLINCLUDE
        
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
      
        TEXTURECUBE(_Cubemap);
        SAMPLER(sampler_Cubemap);
      
        CBUFFER_START(UnityPerMaterial)
        // texture_ST
        float4 _Cubemap_ST;

        // 基础材质属性
        half3 _BaseColor;
        
        // 反射相关
        half3 _ReflectColor;
        half _ReflectIntensity;
        half _MipLevel;
      
        CBUFFER_END
        ENDHLSL
        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            HLSLPROGRAM
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile_fragment _SHADOWS_SOFT

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float3 reflectLightDirWS : TEXCOORD2;
                float4 shadowCoord : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(OUT.positionWS);
                OUT.reflectLightDirWS = reflect(-viewDirWS, OUT.normalWS);
                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                // 基础向量
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                
                // 纹理采样
                half4 cubemap = SAMPLE_TEXTURECUBE_LOD(_Cubemap, sampler_Cubemap, IN.reflectLightDirWS, _MipLevel);
                
                // 光照计算
                half3 albedo = _BaseColor;
                half lambert = dot(lightDirWS, normalWS);
                half3 diffuse = mainLight.color * albedo * saturate(lambert);
                half3 reflection = cubemap.rgb * _ReflectColor;
                
                half3 finalColor = lerp(diffuse, reflection, _ReflectIntensity) * mainLight.shadowAttenuation;
                return half4(finalColor, 1);
            }
            
            ENDHLSL
        }
        Pass
        {
            Tags
            {
                "LightMode" = "ShadowCaster"
            }

            ZWrite On
            ZTest LEqual
            ColorMask 0
            Cull [_Cull]
            HLSLPROGRAM
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _CASTING_PUNCTUAL_LIGHT_SHADOW

            #pragma vertex ShadowVert
            #pragma fragment ShadowFrag

            float3 _LightDirection;
            float3 _LightPosition;

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            Varyings ShadowVert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                float3 positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                float3 normalWS = normalInputs.normalWS;

                #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                float3 lightDirWS = normalize(_LightPosition - positionWS);
                #else
                float3 lightDirWS = _LightDirection;
                #endif

                float4 positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, lightDirWS));

                #if UNITY_REVERSED_Z
                positionCS.z = min(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #else
                positionCS.z = max(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                OUT.positionCS = positionCS;
                return OUT;
            }

            half4 ShadowFrag(Varyings IN) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
    }
}

```

Mip：2的效果：

<!-- 这是一张图片，ocr 内容为： -->
![Mip：2](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781575475417-75a64c89-5e4a-4063-bde0-c38702e3d264.png)

### 折射
在这一节，我们将学习如何在Unity Shader中模拟另一个环境映射的常见应用——折射。

折射的物理原理比反射复杂一些。我们在初中物理就已经接触过折射的定义：当光线从一种介质（如空气）斜射入另一种介质（如玻璃）时，传播方向一般会发生改变。当给定入射角时，我们可以使用**斯涅尔定律（Snell's Law）** 来计算折射角。当光从介质1沿着和表面法线夹角为$\theta_1$的方向斜射入介质2时，我们可以使用如下公式计算折射光线与法线的夹角$\theta_2$：

$$\eta_1sin\theta_1=\eta_2sin\theta_2$$

其中$\eta_1$和$\eta_2$和分别是两个介质的折射率（index of refraction）。折射率是一项重要的物理常数，例如真空的折射率为1，而玻璃的折射率一般是1.5。下图给出了这些变量之间的关系：

<!-- 这是一张图片，ocr 内容为： -->
![斯涅尔定律](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781578451396-c6b69ff5-e4a6-4223-be03-970b589f79cd.png)

通常来说，当得到折射方向后我们就会直接使用它来对立方体纹理进行采样，但这是不符合物体规律的。对一个透明物体来说，一种更准确的模拟方法需要计算两次折射——一次是当光线进入它的内部时，而另一次则是从它内部射出时。但是，想要在实时渲染中模拟出第二次折射方向是比较复杂的，而且仅仅模拟一次得到的效果从视觉上看起来“也挺像那么回事”。正如我们之前提到的，图形学第一准则“如果它看起来是对的，那么它就是对的”。因此在实时渲染中，我们通常仅模拟一次折射。

接下来是代码实现，我们声明了一些新变量：

```shaderlab
Properties
{
    // 材质信息
    [Header(Texture)] [Space(5)]
    _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

    // 基础材质属性
    [Header(Texture Properties)] [Space(5)]
    _BaseColor ("基础颜色", Color) = (1, 1, 1)

    // 折射相关
    [Header(Refraction)] [Space(5)]
    _RefractColor ("折射颜色", Color) = (1, 1, 1)
    _RefractIntensity ("折射强度", Range(0, 1)) = 1
    _RefractRatio ("透射比", Range(0.1, 1)) = 0.5

    // 控制信息
    [Header(Control Info)] [Space(5)]
    [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
}
```

其中`_RefractColor`、`_RefractIntensity`和`_Cubemap`与反射的实现中使用的属性类似。除此之外，我们还使用了一个属性`_RefractRatio`，我们需要使用该属性得到不同介质的透射比，以此来计算折射方向。

在顶点着色器中计算折射方向：

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionCS = positionInputs.positionCS;
    OUT.positionWS = positionInputs.positionWS;
    VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
    OUT.normalWS = normalInputs.normalWS;

    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(OUT.positionWS);
    // 计算折射方向
    OUT.refractLightDirWS = refract(-viewDirWS, OUT.normalWS, _RefractRatio);
    OUT.shadowCoord = GetShadowCoord(positionInputs);
    return OUT;
}
```

我们使用了`refract`函数来计算折射方向，第一个参数是入射方向，第二个参数是法线方向，这两个都都需要归一化，由于`GetWorldSpaceNormalizeViewDir`和`GetVertexNormalInputs`函数得到的都是归一化后的值，所以可以直接写，第三个参数是入射光线所在介质的折射率和折射关系所在介质的折射率之间的比值，例如如果光是从空气射到玻璃表面，那么这个参数应该是空气的折射率和玻璃的折射率之间的比值，即1/1.5。它的返回值就是计算而得的折射方向，它的模等于入射光线的模。

然后我们在片元着色器中使用折射方向对立方体纹理进行采样：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    // 基础向量
    Light mainLight = GetMainLight(IN.shadowCoord);
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);

    // 纹理采样
    half4 cubemap = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, IN.refractLightDirWS);

    // 光照计算
    half3 albedo = _BaseColor;
    half lambert = dot(lightDirWS, normalWS);
    half3 diffuse = mainLight.color * albedo * saturate(lambert);
    half3 refraction = cubemap.rgb * _RefractColor;

    half3 finalColor = lerp(diffuse, refraction, _RefractIntensity) * mainLight.shadowAttenuation;
    return half4(finalColor, 1);
}
```

同样，我们也没有对`IN.refractLightDirWS`进行归一化操作，因为对立方体纹理的采样只需要提供方向即可。

完整代码：

```shaderlab
Shader "Unlit/Refraction"
{
    Properties
    {
        // 材质信息
        [Header(Texture)] [Space(5)]
        _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

        // 基础材质属性
        [Header(Texture Properties)] [Space(5)]
        _BaseColor ("基础颜色", Color) = (1, 1, 1)
        
        // 折射相关
        [Header(Refraction)] [Space(5)]
        _RefractColor ("折射颜色", Color) = (1, 1, 1)
        _RefractIntensity ("折射强度", Range(0, 1)) = 1
        _RefractRatio ("折射率", Range(0.1, 1)) = 0.5
          
        // 控制信息
        [Header(Control Info)] [Space(5)]
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"  
        }
        HLSLINCLUDE
        
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
      
        TEXTURECUBE(_Cubemap);
        SAMPLER(sampler_Cubemap);
      
        CBUFFER_START(UnityPerMaterial)
        // texture_ST
        float4 _Cubemap_ST;

        // 基础材质属性
        half3 _BaseColor;
        
        // 折射相关
        half3 _RefractColor;
        half _RefractIntensity;
        half _RefractRatio;
      
        CBUFFER_END
        ENDHLSL
        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            HLSLPROGRAM
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile_fragment _SHADOWS_SOFT

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float3 refractLightDirWS : TEXCOORD2;
                float4 shadowCoord : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(OUT.positionWS);
                OUT.refractLightDirWS = refract(-viewDirWS, OUT.normalWS, _RefractRatio);
                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                // 基础向量
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                
                // 纹理采样
                half4 cubemap = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, IN.refractLightDirWS);
                
                // 光照计算
                half3 albedo = _BaseColor;
                half lambert = dot(lightDirWS, normalWS);
                half3 diffuse = mainLight.color * albedo * saturate(lambert);
                half3 refraction = cubemap.rgb * _RefractColor;
                
                half3 finalColor = lerp(diffuse, refraction, _RefractIntensity) * mainLight.shadowAttenuation;
                return half4(finalColor, 1);
            }
            
            ENDHLSL
        }
        Pass
        {
            Tags
            {
                "LightMode" = "ShadowCaster"
            }

            ZWrite On
            ZTest LEqual
            ColorMask 0
            Cull [_Cull]
            HLSLPROGRAM
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _CASTING_PUNCTUAL_LIGHT_SHADOW

            #pragma vertex ShadowVert
            #pragma fragment ShadowFrag

            float3 _LightDirection;
            float3 _LightPosition;

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            Varyings ShadowVert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                float3 positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                float3 normalWS = normalInputs.normalWS;

                #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                float3 lightDirWS = normalize(_LightPosition - positionWS);
                #else
                float3 lightDirWS = _LightDirection;
                #endif

                float4 positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, lightDirWS));

                #if UNITY_REVERSED_Z
                positionCS.z = min(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #else
                positionCS.z = max(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                OUT.positionCS = positionCS;
                return OUT;
            }

            half4 ShadowFrag(Varyings IN) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
    }
}

```

效果：

<!-- 这是一张图片，ocr 内容为： -->
![调整透射比效果](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1781580078600-36b76ff5-b925-4807-82a2-d9cf3923a80d.gif)

### 菲涅耳反射
在实时渲染中，我们经常会使用菲涅耳反射（Fresnel reflection）来根据视角方向控制反射程度。通俗的讲，菲涅耳反射描述了一种光学现象，即当光线照射到物体表面上时，一部分发生反射，一部分进入物体内部，发生折射或散射。被反射的光和入射光之间存在一定的比率关系，这个比率关系可以通过菲涅耳等式计算。一个经常使用的例子是，当你站在湖边，直接低头看脚边的水面时，你会发现水几乎是透明的，你可以直接看到水底的小鱼和石子；但是，当你抬头看远处的水面时，会发现几乎看不到水下的情景，而只能看到水面反射的环境。这就是所谓的菲涅耳效果，这是基于物理的渲染中非常重要的一项高光反射计算因子（详见18章）。

那么，我们如何计算菲涅耳反射呢？这就需要使用菲涅耳等式。真实世界的菲涅耳等式是非常复杂的，但在实时渲染中，我们通常会使用一些近似公式来计算。其中一个著名的近似公式就是 **Schlick 菲涅耳近似等式 ：**

$$F_{Schlick}(v,n)=F_0+(1-F_0)(1-v·n)^5$$

其中，$F_0$是一个反射系数，用于控制菲涅耳反射的强度，$v$是视角方向，$n$是表面法线。另一个应用比较广泛的等式是**Empricial** 菲涅耳近似等式：

$$F_{Empricial}(v,n)=max(0,min(1,bias+scale×(1-v·n)^{power}))$$

其中，$bias$、$scale$和$power$是控制项。

使用上面的菲涅耳近似等式，我们可以在边界处模拟反射光强和折射光强/漫反射光强之间的变化。在许多车漆、水面等材质的渲染中，我们会经常使用菲涅耳反射来模拟更加真实的反射效果。

这里，我们先使用 Schlick 菲涅耳近似等式来模拟菲涅耳二反射

先声明了用于调整菲涅耳反射的属性以及反射使用的Cubemap：

```shaderlab
Properties
{
    // 材质信息
    [Header(Texture)] [Space(5)]
    _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

    // 基础材质属性
    [Header(Texture Properties)] [Space(5)]
    _BaseColor ("基础颜色", Color) = (1, 1, 1)

    // 菲涅耳相关
    [Header(Fresnel)] [Space(5)]
    _FresnelScale ("反射系数", Range(0, 1)) = 1

    // 控制信息
    [Header(Control Info)] [Space(5)]
    [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
}
```

顶点着色器与之前计算反射的一样，我们在片元着色器中计算菲涅耳反射，并使用结果混合漫反射光照和反射光照：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    // 基础向量
    Light mainLight = GetMainLight(IN.shadowCoord);
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);

    // 中间量
    half ndotvWS = dot(normalWS, viewDirWS);

    // 纹理采样
    half4 cubemap = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, IN.reflectLightDirWS);

    // 光照计算
    half3 albedo = _BaseColor;
    half lambert = dot(lightDirWS, normalWS);
    half3 diffuse = mainLight.color * albedo * saturate(lambert);
    half3 reflection = cubemap.rgb;

    // 菲涅耳反射
    half fresnel = _FresnelScale + (1 - _FresnelScale) * pow(1 - ndotvWS, 5);

    half3 finalColor = lerp(diffuse, reflection, saturate(fresnel)) * mainLight.shadowAttenuation;
    return half4(finalColor, 1);
}
```

完整代码：

```shaderlab
Shader "Unlit/fresnel"
{
    Properties
    {
        // 材质信息
        [Header(Texture)] [Space(5)]
        _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

        // 基础材质属性
        [Header(Texture Properties)] [Space(5)]
        _BaseColor ("基础颜色", Color) = (1, 1, 1)
        
        // 菲涅耳相关
        [Header(Fresnel)] [Space(5)]
        _FresnelScale ("反射系数", Range(0, 1)) = 1
          
        // 控制信息
        [Header(Control Info)] [Space(5)]
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"  
        }
        HLSLINCLUDE
        
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
      
        TEXTURECUBE(_Cubemap);
        SAMPLER(sampler_Cubemap);
      
        CBUFFER_START(UnityPerMaterial)
        // texture_ST
        float4 _Cubemap_ST;

        // 基础材质属性
        half3 _BaseColor;
        
        // 菲涅耳相关
        half _FresnelScale;
      
        CBUFFER_END
        ENDHLSL
        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            HLSLPROGRAM
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile_fragment _SHADOWS_SOFT

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float3 reflectLightDirWS : TEXCOORD2;
                float4 shadowCoord : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(OUT.positionWS);
                OUT.reflectLightDirWS = reflect(-viewDirWS, OUT.normalWS);
                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                // 基础向量
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                
                // 中间量
                half ndotvWS = dot(normalWS, viewDirWS);
                
                // 纹理采样
                half4 cubemap = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, IN.reflectLightDirWS);
                
                // 光照计算
                half3 albedo = _BaseColor;
                half lambert = dot(lightDirWS, normalWS);
                half3 diffuse = mainLight.color * albedo * saturate(lambert);
                half3 reflection = cubemap.rgb;
                
                // 菲涅耳反射
                half fresnel = _FresnelScale + (1 - _FresnelScale) * pow(1 - ndotvWS, 5);
                
                half3 finalColor = lerp(diffuse, reflection, saturate(fresnel)) * mainLight.shadowAttenuation;
                return half4(finalColor, 1);
            }
            
            ENDHLSL
        }
        Pass
        {
            Tags
            {
                "LightMode" = "ShadowCaster"
            }

            ZWrite On
            ZTest LEqual
            ColorMask 0
            Cull [_Cull]
            HLSLPROGRAM
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _CASTING_PUNCTUAL_LIGHT_SHADOW

            #pragma vertex ShadowVert
            #pragma fragment ShadowFrag

            float3 _LightDirection;
            float3 _LightPosition;

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            Varyings ShadowVert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                float3 positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                float3 normalWS = normalInputs.normalWS;

                #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                float3 lightDirWS = normalize(_LightPosition - positionWS);
                #else
                float3 lightDirWS = _LightDirection;
                #endif

                float4 positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, lightDirWS));

                #if UNITY_REVERSED_Z
                positionCS.z = min(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #else
                positionCS.z = max(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                OUT.positionCS = positionCS;
                return OUT;
            }

            half4 ShadowFrag(Varyings IN) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
    }
}

```

在边缘有细微的反射：

<!-- 这是一张图片，ocr 内容为： -->
![菲涅耳反射](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781609628437-d1419408-315a-4a6d-88ef-4d5f2b788fdc.png)

在上面的代码中，我们使用 Schlick 菲涅耳近似等式来计算 fresnel 变量，并使用它来混合漫反射光照和反射光照。一些实现也会直接把fresnel和反射光照相乘后叠加到漫反射上，模拟边缘光照的效果。

```shaderlab
half3 finalColor = diffuse * mainLight.shadowAttenuation + reflection * fresnel;
```

<!-- 这是一张图片，ocr 内容为： -->
![效果几乎没有变化](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781609765377-e541394f-150c-42a3-ba6c-8ff8c485b48b.png)

下面我们再使用Empricial菲涅耳近似等式实现一次：

添加新的变量，用于控制偏移和菲涅耳强度：

```shaderlab
Properties
{
    // 材质信息
    [Header(Texture)] [Space(5)]
    _Cubemap ("立方体纹理", Cube) = "_Skybox" {}

    // 基础材质属性
    [Header(Texture Properties)] [Space(5)]
    _BaseColor ("基础颜色", Color) = (1, 1, 1)

    // 菲涅耳相关
    [Header(Fresnel)] [Space(5)]
    _FresnelScale ("反射系数", Range(0, 1)) = 1
    _FresnelBias ("反射偏移", Range(0, 1)) = 0
    _FresnelPower ("菲涅耳强度", Range(0, 10)) = 5

    // 控制信息
    [Header(Control Info)] [Space(5)]
    [Enum(UnityEngine.Rendering.CullMode)] _Cull ("阴影剔除模式", Float) = 0
}
```

然后在片元着色器中修改公式：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    // 基础向量
    Light mainLight = GetMainLight(IN.shadowCoord);
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);

    // 中间量
    half ndotvWS = dot(normalWS, viewDirWS);

    // 纹理采样
    half4 cubemap = SAMPLE_TEXTURECUBE(_Cubemap, sampler_Cubemap, IN.reflectLightDirWS);

    // 光照计算
    half3 albedo = _BaseColor;
    half lambert = dot(lightDirWS, normalWS);
    half3 diffuse = mainLight.color * albedo * saturate(lambert) ;
    half3 reflection = cubemap.rgb;

    // 菲涅耳反射
    half fresnel = max(0, min(1, _FresnelBias + _FresnelScale * pow(1 - ndotvWS, _FresnelPower)));

    half3 finalColor = lerp(diffuse, reflection, saturate(fresnel)) * mainLight.shadowAttenuation;
    return half4(finalColor, 1);
}
```

<!-- 这是一张图片，ocr 内容为： -->
![Empricial菲涅耳近似等式](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1781610123525-26901528-2ee8-41a7-89ea-a9a4d350105a.gif)

# 渲染纹理
在之前的学习中，一个摄像机的渲染结果会输出到颜色缓冲中，并显示到我们的屏幕上。现代的CPU允许我们把整个三维场景渲染到一个中间缓冲中，即渲染目标纹理（Render Target Texture，RTT），而不是传统的帧缓冲或后备缓冲（back buffer）。与之相关的是多重渲染目标（Multiple Render Target，MRT），这种技术指的是CPU允许我们把场景同时渲染到多个渲染目标纹理中，而不再需要为每个渲染目标纹理单独渲染完整的场景。延迟渲染就是使用多重渲染目标的一个应用。

Unity为渲染目标纹理定义了一种专门的纹理类型——渲染纹理（Render Texture）。在Unity中使用渲染纹理通常有两种方式：一种方式是在Project目录下创建一个渲染纹理，然后把某个摄像机的渲染目标设置为该渲染纹理，这样一来该摄像机的渲染结果就会实时更新到渲染纹理中，而不会显示在屏幕上。使用这种方法，我们还可以选择渲染纹理的分辨率、滤波模式等纹理属性。Unity会把这个屏幕图像放到一张和屏幕分辨率等同的渲染纹理中，下面我们可以在自定义的Pass中把它们当成普通纹理来处理，从而实现各种屏幕特效。

## 镜子效果
在本节中，我们将学习如何使用渲染纹理来模拟镜子效果。

首先创建6个立方体，并调整它们的位置和大小，使得它们构成围绕着摄像机的房间的六面墙。向场景中添加3个点光源，并调整它们的位置，使它们可以照亮整个房间。

创建3个球体和2个正方体，调整他们的位置和大小，这些物体将作为房间内的饰品。

创建一个四边形，调整它的位置和大小，它将作为镜子。

创建一个shader和材质，把材质托给这个四边形。

在Project视图下创建一个渲染纹理（右键点击Create -> Render Texture）

<!-- 这是一张图片，ocr 内容为： -->
![创建渲染纹理](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781612664213-64d38e75-374d-4e8d-afb4-738e7e7b4a87.png)

最后为了得到从镜子出发观察到的场景图像，我们还需要创建一个摄像机，并调整它的位置、视角，使得它的显示图像是我们希望的镜子图像。由于这个摄像机不需要直接显示在屏幕上，而是用于渲染到纹理，因此，我们把之前创建的渲染纹理拖拽到该摄像机Camera组件下Output -> Output Texture中

<!-- 这是一张图片，ocr 内容为： -->
![放置渲染纹理](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781612820135-130adf76-625e-4cee-95f6-3c2954a65ee7.png)

然后对渲染纹理进行设置，如下设置：

<!-- 这是一张图片，ocr 内容为： -->
![渲染纹理设置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781613010599-d5906562-b2d3-4c7f-b2f6-57b4a1a5693b.png)

然后我们在Properties只需要声明一个渲染纹理就可以：

```shaderlab
_RenderMap ("渲染纹理", 2D) = "white" {}
```

在顶点着色器中计算纹理坐标：

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionCS = positionInputs.positionCS;
    OUT.uv0 = IN.uv0;
    OUT.uv0.x = 1 - OUT.uv0.x;
    return OUT;
}
```

在上面的代码中，我们翻转了x分量的纹理坐标，这是因为，镜子里显示的图像都是左右相反的。

在片元着色器中对渲染纹理进行采样和输出：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    return SAMPLE_TEXTURE2D(_RenderMap, sampler_RenderMap, IN.uv0);
}
```

然后就会有以下效果：

<!-- 这是一张图片，ocr 内容为： -->
![镜子效果](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1781612381327-26cea580-1b11-49b7-a588-0264355c964a.gif)

在上面的实现中，我们把渲染纹理的分辨率大小设置为256x256，有时，这样的分辨率会使图像模糊不清，此时我们可以使用更高的分辨率或更多的抗锯齿采样等。但需要注意的是，更高的分辨率会影响宽带和性能，我们应道尽量使用较小的分辨率。

## 玻璃效果
在Unity中，我们还可以在Unity Shader中使用一种特殊的纹理贴图来完成获取屏幕图像的目的，这就是`_CameraOpaqueTexture`，Unity会把不透明物体渲染后的屏幕图形绘制在这张纹理中，我们通常会使用它来实现诸如玻璃等透明材质的模拟，与使用简单的透明混合不同，使用这张纹理可以让我们对该物体后面的图像进行更复杂的处理，例如使用法线来模拟折射效果，而不再是简单的和原屏幕颜色进行混合。

需要注意的是，在使用`_CameraOpaqueTexture`的适合，我们需要额外小心物体的渲染队列设置，正如之前所说，Unity会把不透明物体渲染后的屏幕图形绘制在这张纹理中，尽管代码中并不包含混合指令，但我们往往仍然需要把物体的渲染队列设置为透明队列（即`"Queue" = "Transparent"`）。这样才能保证当渲染该物体时，所有的不透明物体都已经被绘制在屏幕上。

在这一节，我们将会`_CameraOpaqueTexture`来模拟一个玻璃效果。我们首先使用一张法线贴图来修改模型的法线信息，然后使用之前介绍的反射方法，通过一个Cubemap来模拟玻璃的反射，而在模拟折射时，则使用了`_CameraOpaqueTexture`获取玻璃后面的屏幕图像，并使用切线空间下的法线对屏幕纹理坐标偏移后，再去对`_CameraOpaqueTexture`进行采样来模拟近似的折射效果。

新建一个场景，在场景中布置6面墙围成的封闭房间，将书中的Glass贴图应用到墙体上，在房间内防止一个立方体，并在立方体中放置一个球体。

首先，我们声明一下会使用到的参数

```shaderlab
Properties
{
    [Header(Texture)] [Space(5)]
    [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
    [MainTexture] _BaseMap("基础帖图", 2D) = "white" {}
    _NormalMap ("法线贴图", 2D) = "bump" {}
    _NormalScale ("法线凹凸程度", Range(-1, 1)) = 1
    _CubeMap ("环境立方体纹理", Cube) = "_Skybox" {}

    [Header(Properties)] [Space(5)]
    _Distortion ("折射扭曲", Range(0, 100)) = 10
    _RefractAmount ("折射程度", Range(0, 1)) = 1
}
```

_Cubemap是用于模拟反射的环境纹理，_Distortion是用于控制模拟折射时图形的扭曲程度，_RefractAmount用于控制折射程度（折射占比），当_RefractAmount为0时，该玻璃只会包含反射效果，为1时，只包含折射效果。

记住渲染队列一定要是透明队列

```shaderlab
Tags
{
    "RenderPipeline" = "UniversalPipeline"
    "RenderType" = "Opaque"
    "Queue" = "Transparent"
}
```

首先在SubShader的标签中将渲染队列设置为Transparent，尽管后面的RenderType被设置为了Opaque。这两者看似矛盾，但实际上服务于不同的需求。把Queue设置为了Transparent可以确保渲染时，其他所有不透明物体都已经被渲染到屏幕上了，而设置RenderType为Opaque是为了在使用着色器替换（Shader Replacement）时，该物体可以在需要时被正确渲染，这通常发生在我们需要得到摄像机的深度和法线纹理时，这将在第13章学到。

```shaderlab
TEXTURE2D(_BaseMap);
SAMPLER(sampler_BaseMap);
TEXTURE2D(_NormalMap);
SAMPLER(sampler_NormalMap);
TEXTURECUBE(_CubeMap);
SAMPLER(sampler_CubeMap);
TEXTURE2D(_CameraOpaqueTexture);
SAMPLER(SamplerState_Point_Repeat);

CBUFFER_START(UnityPerMaterial)
half4 _BaseColor;
half4 _BaseMap_ST;
half4 _NormalMap_ST;
half _NormalScale;
half4 _CameraOpaqueTexture_ST;
half4 _CameraOpaqueTexture_TexelSize;

half _Distortion;
half _RefractAmount;

CBUFFER_END
```

需要注意的是，我们还定义了_CameraOpaqueTexture_TexelSize，`_TexelSize`这个后缀可以让我们得到该纹理的纹素大小，例如一个大小为256x512的纹理，它的纹素大小为（1/256，1/512），我们需要对屏幕图像采用坐标进行偏移时使用该变量。

顶点着色器和片元着色器中计算采样法线贴图的内容就不在赘述了。

```shaderlab
half4 frag(Varyings IN) : SV_Target
{
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
    half3 normalWS = normalize(IN.normalWS);
    half3 tangentWS = normalize(IN.tangentWS.xyz);
    half flipSign = IN.tangentWS.w;
    float3x3 TBN  = CreateTangentToWorld(normalWS, tangentWS, flipSign);
    half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv);
    half3 normalTS = UnpackNormalScale(packedNormal, _NormalScale);
    half3 finalNormalWS = TransformTangentToWorld(normalTS, TBN);

    half3 reflectViewDirWS = reflect(-viewDirWS, finalNormalWS);

    // 新增代码
    half2 offset = normalTS.xy * _CameraOpaqueTexture_TexelSize.xy * _Distortion;
    half2 screenUV = IN.positionHCS.xy / _ScreenParams.xy + offset;
    half4 grabMap = SAMPLE_TEXTURE2D(_CameraOpaqueTexture, SamplerState_Point_Repeat, screenUV);

    half4 cubeMap = SAMPLE_TEXTURECUBE(_CubeMap, sampler_CubeMap, reflectViewDirWS);

    half3 finalColor = lerp(cubeMap.rgb, grabMap.rgb, _RefractAmount);
    return half4(finalColor, 1);
}
```

我们使用齐次裁剪坐标与屏幕大小的比值将齐次裁剪坐标映射到[0. 1]中作为屏幕UV，然后我们使用切线空间下的法线与_Distortion以及_CameraOpaqueTexture_TexelSize来对屏幕图像的采样坐标进行偏移，模拟折射效果。_Distortion值越大，偏移量越大，玻璃背后的物体看起来变形程度越大。

:::info
更详细见 [这里](https://www.yuque.com/alokiria/eau3f9/wh0q3w93xc2fwf33)

:::

在这里我们选择使用切线空间下的法线方向来偏移，是因为该空间下的法线可以反应顶点局部空间下的法线方向。然后我们使用屏幕坐标对_CameraOpaqueTexture进行采样就能得到模拟的折射颜色了。

效果如下：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1785817917828-e4583bd8-6846-465f-8c1f-036ff234c47d.gif)

之后我们使用视角的反射方向去采样环境立方体贴图，得到反射颜色，最后使用_RefractAmount对反射和折射颜色进行混合，作为最终的输出颜色。

完整代码：

```shaderlab
Shader "Custom/Glass"
{
    Properties
    {
        [Header(Texture)] [Space(5)]
        [MainColor] _BaseColor("基础颜色", Color) = (1, 1, 1, 1)
        [MainTexture] _BaseMap("基础帖图", 2D) = "white" {}
        _NormalMap ("法线贴图", 2D) = "bump" {}
        _NormalScale ("法线凹凸程度", Range(-1, 1)) = 1
        _CubeMap ("环境立方体纹理", Cube) = "_Skybox" {}
        
        [Header(Properties)] [Space(5)]
        _Distortion ("折射扭曲", Range(0, 100)) = 10
        _RefractAmount ("折射程度", Range(0, 1)) = 1
    }

    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"
            "Queue" = "Transparent"
        }
        
        HLSLINCLUDE
        
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        
        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);
        TEXTURE2D(_NormalMap);
        SAMPLER(sampler_NormalMap);
        TEXTURECUBE(_CubeMap);
        SAMPLER(sampler_CubeMap);
        TEXTURE2D(_CameraOpaqueTexture);
        SAMPLER(SamplerState_Point_Repeat);
            
        CBUFFER_START(UnityPerMaterial)
        half4 _BaseColor;
        half4 _BaseMap_ST;
        half4 _NormalMap_ST;
        half _NormalScale;
        half4 _CameraOpaqueTexture_ST;
        half4 _CameraOpaqueTexture_TexelSize;
            
        half _Distortion;
        half _RefractAmount;
        CBUFFER_END
        
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            HLSLPROGRAM
            
            #pragma vertex vert
            #pragma fragment frag
            
            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 tangentOS : TANGENT;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float4 tangentWS : TEXCOORD2;
                float3 positionWS : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
                OUT.normalWS = normalInputs.normalWS;
                OUT.tangentWS = float4(normalInputs.tangentWS, IN.tangentOS.w);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                half3 normalWS = normalize(IN.normalWS);
                half3 tangentWS = normalize(IN.tangentWS.xyz);
                half flipSign = IN.tangentWS.w;
                float3x3 TBN  = CreateTangentToWorld(normalWS, tangentWS, flipSign);
                half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv);
                half3 normalTS = UnpackNormalScale(packedNormal, _NormalScale);
                half3 finalNormalWS = TransformTangentToWorld(normalTS, TBN);
                
                half3 reflectViewDirWS = reflect(-viewDirWS, finalNormalWS);
                
                half2 offset = normalTS.xy * _CameraOpaqueTexture_TexelSize.xy * _Distortion;
                half2 screenUV = IN.positionHCS.xy / _ScreenParams.xy + offset;
                half4 grabMap = SAMPLE_TEXTURE2D(_CameraOpaqueTexture, SamplerState_Point_Repeat, screenUV);
                
                half4 cubeMap = SAMPLE_TEXTURECUBE(_CubeMap, sampler_CubeMap, reflectViewDirWS);

                half3 finalColor = lerp(cubeMap.rgb, grabMap.rgb, _RefractAmount);
                return half4(finalColor, 1);
            }
            ENDHLSL
        }
        UsePass "Universal Render Pipeline/Lit/ShadowCaster"
        UsePass "Universal Render Pipeline/Lit/DepthOnly"
    }
}

```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1785818196217-18ea1af3-94aa-4fea-b8be-f2bcf096f40a.gif)

# 程序纹理
程序纹理（Procedural Texture）指的是哪些由计算机生成的图像，我们通常使用一些特定的算法来创建个性化图案或非常真实的自然元素，例如木头、石子等。使用程序纹理的好处在于我们可以使用各种参数来控制纹理的外观，而这些属性不仅仅是那些颜色属性，甚至可以是完全不同类型的图案属性，这使得我们可以得到更加丰富的动画和视觉效果。在本节中，我们首先会尝试使用算法来实现一个非常简单的程序材质。然后会介绍Unity里一类专门使用程序纹理的材质——程序材质。

## 简单的程序材质
新建一个场景，我们使用第七章的单张纹理的Shader创建一个材质，命名为ProceduralTextureMat，并在场景中创建一个立方体把材质赋予给它。

我们并没有为ProceduralTextureMat材质赋予任何纹理，这是因为我们想要使用脚本来创建程序纹理。为此，我们再创建一个脚本ProceduralTextureGeneration.cs，并把它拖拽给立方体上。

我们将会使用代码来生成一个波点纹理，为此，打开ProceduralTextureGeneration.cs，进行如下编写：

为了脚本能够在编辑器模式下运行，我们需要在类的前面加上`[ExecuteInEditMode]`：

```shaderlab
// 使得生命周期函数在编辑模式下也能运行
[ExecuteInEditMode]
public class ProceduralTextureGeneration : MonoBehaviour
{
}
```

然后声明一个材质，这个材质讲使用该脚本生成的程序纹理：

```shaderlab
public Material material = null;
```

然后声明该程序纹理使用的各种参数：

```shaderlab
#region Meterial Properties

// SerializeField用于使得私用成员能够在inspector中显示并修改
// SetProperty填写与get/set一致的名字
[SerializeField, SetProperty("textureSize")]
private int m_textureSize = 512;
public int textureSize
{
    get { return m_textureSize; }
    set { m_textureSize = value; _UpdateMaterial(); }
}

[SerializeField, SetProperty("backgroundColor")]
private Color m_backgroundColor = Color.white;
public Color backgroundColor
{
    get { return m_backgroundColor; }
    set { m_backgroundColor = value; _UpdateMaterial(); }
}

[SerializeField, SetProperty("circleColor")]
private Color m_circleColor = Color.white;
public Color circleColor
{
    get { return m_circleColor; }
    set { m_circleColor = value; _UpdateMaterial(); }
}

[SerializeField, SetProperty("circleCount")]
private int m_circleCount = 3;
public int circleCount
{
    get { return m_circleCount; }
    set { m_circleCount = value; _UpdateMaterial(); }
}

[SerializeField, SetProperty("blurFactor")]
private float m_blurFactor = 2.0f;
public float blurFactor
{
    get { return m_blurFactor; }
    set { m_blurFactor = value; _UpdateMaterial(); }
}

#endregion
```

`#region`和`#endregion`的作用是威力组织代码，可以让代码在IDE中进行折叠<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785983790081-d94e78d0-618d-4b73-a298-d3e2def02f83.png)

由于我们生成的纹理是由若干圆点构成的，因此在上面的代码中，我们声明了4个纹理属性：纹理的大小`textureSize`，数值通常是2的整数幂；纹理的背景颜色`backgroundColor`；原点的颜色`circleColor`；模糊因子`circleCount`，这个参数是用来模糊圆形的边界，可以达到抗锯齿的效果。注意到我们每个属性都使用了`get/set`的方法，为了在面板上修改属性时仍可以执行`set`函数，我们使用了一个开源插件**SetProperty**，[Github链接地址](https://github.com/amirebrahimi/SetProperty)（插件很简单一共三个cs文件，直接全部塞进项目资产文件夹中即可）。这个插件使得当我们修改了材质属性时，可以执行_UpdateMaterial函数来使用新的属性重新生成程序纹理（刷新）。

:::info
序列化后的private属性，如果在inspector中修改数值，是直接修改的这个私有属性，并不会触发set函数，SetProperties使得在面板中修改了数值后，同时会触发相应名称的set函数

:::

为了保存生成的程序纹理，我们声明一共Texture2D类型的纹理变量

```shaderlab
private Texture2D m_generatedTexture = null;
```

下面开始编写各个函数，首先，我们需要在Start函数中进行相应的检查，以得到需要使用该程序纹理的材质：

```shaderlab
private void Start()
{
    if (material == null)
    {
        Renderer renderer = GetComponent<Renderer>();
        if (renderer == null)
        {
            // 如果没有材质，就返回错误信息
            Debug.LogWarning("Cannot find a renderer");
            return;
        }

        material = renderer.sharedMaterial;
    }

    _UpdateMaterial();
}
```

在上面的代码中，我们首先检查material变量是否为空，如果为空，就尝试从使用该脚本所在的物体上得到相应的材质。完成后，调用`_UpdateMaterial()`函数来为其生成程序纹理。

`_UpdateMaterial()`函数如下：

```shaderlab
private void _UpdateMaterial()
{
    if (material != null)
    {
        m_generatedTexture = _GenerateProceduralTexture();
        material.SetTexture("_BaseMap", m_generatedTexture);
    }
}
```

它确保material不为空，然后调用`_GenerateProceduralTexture()`函数来生成一张程序纹理，并赋给`m_generatedTexture`变量。完成后，利用`Material.SetTexture`函数把生成的纹理赋到材质Shader的基础纹理上，材质material需要有一个相应名字的纹理属性。

`_GenerateProceduralTexture()`函数如下：

```shaderlab
private Texture2D _GenerateProceduralTexture()
{
    // 函数返回的纹理，程序化纹理
    Texture2D proceduralTexture = new Texture2D(textureSize, textureSize);

    // 定义了圆与圆之间的间距
    // 可以理解为把一个面划分为(n+1)*(n+1)个方格，其中间会有n*ｎ个点就是圆心
    // 这里求的就是方格的宽度（边长）
    float circleInterval = textureSize / (circleCount + 1);
    // 定义圆的半径，你也可以改成一个固定的数值。写在前面的属性列表中，在外部修改
    float radius = textureSize / 10.0f;
    // 定义模糊系数
    float edgeBlur = 1.0f / blurFactor;
    
    // 遍历每一个像素
    for (int w = 0; w < textureSize; w++)
    {
        for (int h = 0; h < textureSize; h++)
        {
            // 使用背景元素对当前像素初始化
            Color pixel = backgroundColor;

            // 遍历每一个圆，根据当前像素到各个圆圆心的距离与半径，来判断是否处于某个圆中
            for (int i = 0; i < circleCount; i++)
            {
                for (int j = 0; j < circleCount; j++)
                {
                    // 计算当前遍历到的圆的圆心
                    Vector2 circleCenter = new Vector2(circleInterval * (i + 1), circleInterval * (j + 1));

                    // 计算当前像素距离圆的最短距离（到圆心的距离-半径）
                    // 如果<=0就是在圆上，如果>0就是不在这个圆上
                    float distance = Vector2.Distance(new Vector2(w, h), circleCenter) - radius;

                    // 这里首先使用了平滑插值Mathf.SmoothStep来对模糊系数初步处理
                    // 平衡插值与普通插值的区别就是对t进行了处理，t=-2*t^3+3*t^2，使得过渡更加平滑
                    // 如果当前像素在园内，distance<=0，平滑插值插值返回的值肯定为0，外部插值的值则为circleColor，也就是圆的颜色，意思就是在圆内
                    // 如果当前像素不在圆内，但distance*edgeBlur的值还没用大于1的话，也就是所在的圆外边缘上，会在背景颜色与圆的颜色之间进行平滑
                    // 当edgeBlur越小，所能影响到的范围越大。
                    // 因为edgeBlur是blurFactor的倒数，所以blurFactor越大，模糊范围越大，是符合直觉的，这也是为什么取倒数的原因
                    Color color = Color.Lerp(circleColor, new Color(pixel.r, pixel.g, pixel.b, 0.0f), Mathf.SmoothStep(0f, 1.0f, distance * edgeBlur));

                    // 根据当前颜色的透明度再次对颜色进行处理，透明度为0时，就是背景颜色，否则不变
                    pixel = Color.Lerp(pixel, color, color.a);
                }
            }

            // 把当前像素设置在纹理的(w, h)位置
            proceduralTexture.SetPixel(w, h, pixel);
        }
    }

    // 提交纹理的修改到GPU中
    proceduralTexture.Apply();
    return proceduralTexture;
}
```

代码首先初始化了一张二维纹理，而且提前计算了一些生成纹理时需要的变量。然后，使用了一个两层的嵌套循环遍历纹理中的每个像素，并在纹理上一次绘制几个圆形。最后，调用`Texture2D.Apply()`函数来把所在的修改从CPU提交到GPU中实现真正的写入，并返回该程序纹理。

我们可以在面板中修改各项参数

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785987703694-352c02be-7926-41ba-916a-0434ec91da9f.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785987723500-ece7fc38-4e3a-4247-b079-c1383c5dd6a2.png)

第二种：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785987777444-12b94222-6698-4632-b503-86161b5ff81b.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785987791859-58c0680a-a439-4bb7-9ad5-71896c923fee.png)

## Unity中的程序材质
在Unity中，有一类专门使用程序纹理的材质，叫做程序材质（Procudural Materials）。这类材质和我们之前使用的那些材质在本质上是一样的，不同的是，他们使用的纹理不是普通的纹理，而是程序纹理。需要注意的是，程序材质和它使用的程序纹理并不是在Unity中创建的，而是使用了一个名为Substance Designer的软件在Unity外部生成的。

Substance Designer 是一个非常出色的纹理生成工具，我们可以在[Adobe的资源库](https://substance3d.adobe.com/community-assets)或者网络中获取到很多免费或者付费的Substance材质，这些材质都是以`.sbsar`为后缀的。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785987967128-00f5e8d7-4c76-44f4-bc5b-a1e32ddebf2f.png)

在新版Unity中，想要在Unity中使用，需要下载Adobe官方提供的插件[Substance 3D for Unity](https://assetstore.unity.com/packages/tools/utilities/substance-3d-for-unity-213208)。

当我们把`.sbsar`文件导入到Unity中后，Unity就会生成一个程序纹理资源（Substance File SO），以及若干个文件夹，这些文件夹里面存放这程序材质（Substance Graph SO），一个程序纹理资源可以包含一个或多个程序材质。如下图中最上面那一部分，就是这个程序纹理资源所包含的材质，这里只有一个

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785991952163-ec14afc7-9e52-4623-99cf-a3067b44467a.png)

通过点击这个子材质，我们可以在配置文件的面板上看到该材质使用的Unity Shader以及属性、生成程序纹理使用的纹理属性、材质预览等信息。

程序材质的使用和普通材质是一样的，我们把它们拖拽到相应的模型上即可。

下图展示了同一个程序纹理不同配置下的材质效果：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785992211409-237e8eb9-07ba-4cfd-b5e2-28a87228c5a9.png)<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785992229951-ccc34597-23ef-4437-8ead-114afee7adb1.png)<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1785992256709-d5501b87-d749-49dc-8e1f-ab4526669c2e.png)

可以看出，程序材质的自由度很高，而且可以和Shader配合得到非常出色的视觉效果，它是一种非常强大的材质类型。
