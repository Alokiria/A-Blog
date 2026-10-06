---
title: '第九章 更复杂的光照'
date: 2026-10-03
updated: 2026-10-03
categories: UnityShader入门精要-URP改编
cover: https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/o_251204051842_bg-blog2.jpg
tags:
  - Shaderlab
  - TA
  - 图形学
top: 1
---

在前面的学习中，我们的场景中都仅有一个光源且光源类型是平行光。但在实际的开发过程中，我们往往需要处理数目更多、类型更加复杂的光源。更重要的是，我们想要得到阴影。

# Unity的渲染路径
在Unity中，渲染路径（Rendering Path）决定了光照是如何应用到Unity Shader中的。因此，要和光源打交道，我们需要为每个Pass指定它使用的渲染路径。只有为Shader正确地选择和设置了需要的渲染路径，该Shader的光照计算才能被正确执行。

Unity支持多种类型的渲染路径，在早期版本，主要有3种：前向渲染路径（Forward Renderding Path）、延迟渲染路径（Deferred Rendering Path）和顶点照明渲染路径（Vertex Lit Rendering Path）。在Unity5.0版本之后，顶点照明渲染路径已经被Unity抛弃。而在URP种，还新增了一种新的渲染路径——前向渲染+路径，是前向渲染的升级版，大幅度提升了多光源场景下的性能表现。

大多数情况下，一个项目只使用一种渲染路径，因此我们可以为整个项目设置渲染时的渲染路径，我们可以通过在你目前使用的URP通用渲染器（Universal Renderer）资源种，找到Rendering→Rendering Path属性来选择项目所需的渲染路径，默认情况下，该设置选择的是前向渲染路径（Forward），如下图：

<!-- 这是一张图片，ocr 内容为： -->
![选择渲染路径](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779849825826-104d6e2b-2210-4d04-a65d-50475d3991db.png)

但有时，我们希望可以使用多个渲染路径，例如摄像机A渲染的物体使用前向渲染路径，而摄像机B渲染的物体使用延迟渲染路径。这时，我们可以在每个摄像机的Rendering → Renderer中设置该摄像机使用的URP通用渲染器资源（需要在URP资产中配置多个通用渲染器才可以选择多个）

<!-- 这是一张图片，ocr 内容为： -->
![为摄像机切换通用渲染器](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780274746880-7284cea1-0aa7-42a8-acfd-324dc27d058b.png)<!-- 这是一张图片，ocr 内容为： -->
![在资产中配置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780274812677-3b8d42d2-fae4-4b34-b39d-f48da8f1189c.png)

需要注意的是，如果当前的显卡并不支持所选择的渲染路径，Unity会自动使用更低一级的渲染路径。

完成了上面的设置后，我们就可以在每个Pass中使用标签来指定该Pass使用的渲染路径。这是通过设置Pass的LightMode标签来实现的。不同类型的渲染路径可能会包含多种标签设置。例如，我们之前在代码中写的：

```shaderlab
Pass
{
    Tags { "LightMode" = "UniversalForward" }
```

上面的代码将告诉Unity，该Pass使用前向渲染路径中的UniversalForward路径，下表给出Pass的LightMode标签支持的渲染路径设置选项：

| 标签名 | 描述 |
| --- | --- |
| SRPDefaultUnlit | 不声明LightMode的情况下默认使用，无光照Pass。 |
| UniversalForward | 用于前向/Forward+渲染，URP最常用的主光照Pass，处理主光源、附加光、环境光、光照贴图等 |
| UniversalForwardOnly | 仅用于前向/Forward+渲染路径，延迟渲染路径中会直接跳过，作用与UniversalForward一样 |
| UniversalGBuffer | 用于延迟渲染，渲染G缓冲（G-Buffer）的Pass，会写入颜色、法线、金属/光滑度等信息 |
| ShadowCaster | 把物体的深度信息渲染到阴影映射纹理（shadowmap）或一张深度纹理中 |


只有正确指定了适合的标签，我们的渲染才会正常进行。

那么，Unity的渲染引擎是如何处理这些渲染路径的呢？下面，我们会对这些渲染路径进行更加详细的解释。

# 前向渲染路径
前向渲染路径是传统的渲染方式，也是我们最常用的一种渲染路径。在本节，我们首先会概况前向渲染路径的原理，然后再给出Unity对于前向渲染路径的实现细节和要求，最后给出Unity Shader中哪些内置变量是用于前向渲染路径的。

## 前向渲染路径的原理
每进行一次完整的前向渲染，我们需要渲染该对象的渲染图元，并计算两个缓冲区的信息：一个是颜色缓冲区，一个是深度缓冲区。我们利用深度缓冲来决定一个片元是否可见，如果可见就更新颜色缓冲区中的颜色值。我们可以用下面的伪代码来描述前向渲染路径的大致过程：

```shaderlab
Pass
{	
	for(each primitive in this model)  // 遍历模型中的每个原始模型
    {
        for(each fragment covered by this primitive)  // 遍历这个原始模型中的每个片元
        {
        	if(failed in depth test)  
                // 如果没用通过深度测试，说明该片元是不可见的
                discard;
            else
            {
            	// 如果该片元可见
                // 就进行光照计算
                float4 color = Shading(materialInfo, position, normal, lightDir, viewDir);
            	// 更新帧缓冲
                writeFrameBuffer(fragment, color);
            }
        }
    }
}
```

在传统渲染管线中，对于每个逐像素光源，我们都需要进行上面一次完整的渲染流程。如果一个物体在多个逐像素光源的影响区域中，那么该物体就需要执行多个Pass，每个Pass计算一个逐像素光源的光照结果，然后在帧缓冲中把这些光照结果混合起来得到最终的颜色值。假设，场景中有N个物体，每个物体受M个光源的影响，那么要渲染整个场景一共需要N*M个Pass，可以看出，如果有大量的逐像素光照，那么需要执行的Pass的数目也会很大。

而在URP中，这一核心机制发生了根本性变革。URP采用了单Pass多光源的前向渲染架构，一个物体无论受到多少个逐像素光源的影响，通常只需要执行一个Pass。这个Pass会在片元着色器中通过循环的方式，依次计算所有影响该物体的逐像素光影的光照贡献，然后将它们累加起来得到最终的颜色值。这极大地减少了Draw Call的数量和渲染状态切换的开销，但相应地增加了单个片元着色器的复杂度。

尽管如此，循环的方式开销依旧也不小，因此，渲染引起通常会限制每个物体的逐像素光照的数目。

:::info
在URP中的不同渲染路径中的光照支持：

Forward：每个物体最多实时接收1个主光照与8个附加光照，共9个光照

Forward+：无限制

Deferred：无限制，对于透明物体使用与Forward相同的规则。

:::

## Unity中的前向渲染
事实上，一个Pass不仅仅可以用来计算逐像素光照，它也可以用来计算逐顶点光照。这取决于光照计算所处流水线阶段以及计算时使用的数学模型。当我们渲染一个物体时，Unity会计算哪些光源照亮了它，以及这些光源照亮该物体的方式。

在URP中，前向渲染路径有2种处理实时光源直接光照的方式：逐像素处理和逐顶点处理。而在内置渲染管线种的球谐函数（Spherical Harmonic，SH）在URP种仅用于间接光照。而决定一个光源使用哪种处理模式取决于它的类型和URP资产的全局设置。光源类型指的是该光源是平行光还是其他类型的光源，URP资产的全局设置指的是URP Asset文件种的Lighting栏下的设置：

<!-- 这是一张图片，ocr 内容为： -->
![全局光照设置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780279068152-dc870b8b-03fd-44c7-9ab7-b14a227c50b6.png)

URP中的主光源（Main Light）只能选择逐像素（Per Pixel）的方式处理，或者选择Disabled来使主光源不起作用。主光源可以在Window → Rendering → Lighting → Environment的Sun Source中指定。

<!-- 这是一张图片，ocr 内容为： -->
![指定主光源](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780279353785-58f98107-3919-4259-90c7-d78542b9610d.png)

若未指定主光源，则把场景中光照强度最高的平行光作为主光源。

附加光源（Additional Lights）可以选择逐像素（Per Pixel）或者逐顶点（Per Vertex）的方式处理，或者选择Disabled来让附加光源不起作用，这个设置将应用于所有起作用的附加光源中。可以配置Per Object Limit来限制起作用的附加光数量。可以勾选Cast Shadows来让附加光源也能投射阴影。

在前向渲染中，当我们渲染一个物体时，Unity会根据场景中各个光源对物体的影响程度（例如，距离该物体的远近、光源强度等）对这些光源进行一个重要度排序，根据排序前后来选择限制数量的附加光作为影响物体的光源。

## 内置的光照结构体和函数
这里给出前向渲染中可以使用的结构体和函数：

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| Light | struct | 光照信息结构体，包含了一个光源的所有属性。 |
| GetMainLight() | 函数 | 或者主光源的光照信息，返回一个Light结构体 |
| GetMainLight(float4 shadowCoord) | 函数 | 获取主光源的光照信息，并计算阴影衰减 |
| GetAdditionalLight(unit index, float3 positionWS) | 函数 | 通过索引获取指定附加光源的光照信息 |
| GetAdditionLightsCount() | 函数 | 获取影响当前物体的附加光源总数 |
| LightingLambert(...) | 函数 | 标准兰伯特漫反射光照计算函数 |
| LightingSpecular(...) | 函数 | 标准Blinn-Phong高光光照模型 |


还有很多内置函数，可以自行查找官方文档。

# 延迟渲染路径
前向渲染的问题是：当场景中包含大量实时光源时，前向渲染的性能会急速下降。

延迟渲染是一种更古老的渲染方法，但由于上述前向渲染可能造成的瓶颈问题，近几年又流行起来。除了前向渲染中使用的颜色缓冲和深度缓冲外，延迟渲染还会利用额外的渲染区，这些缓冲区也被称为G缓冲（G-buffer），其中G是英文Geometry的缩写。G缓冲区存储了我们所关心的表面（通常指的是离摄像机最近的表面）的其他信息，例如该表面的法线、位置、用于光照计算的材质属性等。

## 延迟渲染的原理
延迟渲染注意包含了两个Pass。在第一个Pass中，我们不进行任何光照计算，而是仅仅计算哪些片元是可见的，这主要是通过深度缓冲技术来实现，当发现一个片元是可见的，我们就把它的相关信息存储到G缓冲区中。然后在第二个Pass中，我们利用G缓冲区的各个片元信息，例如表面法线、视角方向、漫反射系数等，进行真正的光照计算。延迟渲染的过程大致可以用下面的伪代码来描述：

```shaderlab
Pass 1
{	
	for(each primitive in this model)  // 遍历模型中的每个原始模型
    {
        for(each fragment covered by this primitive)  // 遍历这个原始模型中的每个片元
        {
        	if(failed in depth test)  
                // 如果没用通过深度测试，说明该片元是不可见的
                discard;
            else
            {
            	// 如果该片元可见
                // 就把需要的信息存储到G缓冲中
                writeGBuffer(materialInfo, position, normal);
            }
        }
    }
}
Pass 2
{
	for(each pixel in the screen)
    {
        if(the pixel is valid)
        {
            // 如果该像素是有效的
            // 读取它对应的G缓冲中的信息
            readGBuffer(pixel, materialInfo, position, normal);
        	// 根据读取到的信息进行光照计算
            float4 color = Shading(materialInfo, position, normal, lightDir, viewDir);
            // 更新帧缓冲
            writeFrameBuffer(fragment, color);
        }
    }
}
            
```

可以看出，延迟渲染使用的Pass数目通常是两个，跟场景中包含的光源数目是没用关系的。换句话说，延迟渲染的效率不依赖于场景的复杂度，而是和我们使用的屏幕空间的大小有关。这是因为，我们需要的信息都存储在缓冲区中，而这些缓冲区可以理解成一张张2D图像，我们的计算实际上就是在这些图像空间中进行的。

## Unity中的延迟渲染
对于延迟渲染路径来说，它适合在场景中光源数目很多、如果使用前向渲染会造成性能瓶颈的情况下使用。但是延迟渲染也有一些缺点：

+ 不支持真正的抗锯齿（不支持MSAA，只能用TAA/FXAA等后处理抗锯齿）
+ 不能处理半透明物体

当使用延迟渲染时，Unity要求我们仅提供用于G缓冲的Pass即可。

在这个Pass中，我们会把物体的漫反射颜色、高光反射颜色、平滑度、法线、自发光和深度等信息渲染到屏幕空间的G缓冲区中。对于每个物体来说，这个Pass金辉执行一次。

第二个光照Pass由系统自动完成，如果要自定义，则需要更改系统自带的Pass文件。

# Unity的光源类型
在前面的例子中，我们的场景中都仅仅有一个光源且光源类型是平行光。只有一个平行光的世界很美好，但美梦总有醒的一天，这时，我们就需要在Unity Shader中处理更复杂的光源类型以及数目更多的光源。在这一节，我们将会使用点光源（point light）和聚光灯（spot light）。

Unity一共支持4种光源类型：平行光、点光源、聚光灯和面光源（area light）。面光源仅在烘培时才可发挥作用，因此不在本节讨论范围。由于每种光源的几何定义不同，因此它们对应的光源属性也就各不相同。这就要求我们要区别对待它们，幸运的是，Unity提供了很多内置函数来帮我们处理这些光源。

最常使用的光源属性有光源的位置、方向（更具体说就是：到某点的方向）、颜色、强度以及衰减（更具体说就是：到某点的衰减，与该点到光源的距离有关）这5个属性，而这些属性与它们的几何定义息息相关。

## 平行光
对于我们之前使用的平行光来说，它的几何定义是最简单的。平行光可以照亮的范围是没用限制的，它通常是作为太阳这样的角色在场景中出现的。下面给出平行光Light组件的面板。

平行光之所以简单，是因为它没有一个唯一的位置，也就是说，它可以放在场景中的任意位置（回忆一下，我们小时候是不是总感觉太阳跟着我们一起移动）。它的几何属性只有方向，我们可以调整平行光的Transform组件中的Rotation属性来改变它的光源方向，而且平行光到场景中所有点的方向都是一样的，这也是平行光名字的由来。除此之外，由于平行光没有一共具体的位置，因此也没有衰减的概念，也就是说，光照强度不会随着距离而发生改变。

<!-- 这是一张图片，ocr 内容为： -->
![平行光](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780286915617-b88bddcc-abc1-442c-a189-6135d242de1b.png)<!-- 这是一张图片，ocr 内容为： -->
![平行光](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780285856731-cd710031-1063-4af5-805a-70a95cd50f70.png)

## 点光源
点光源的照亮空间则是有限的，它是由空间中的一个球体定义的。点光源可以表示一个点发出的、向所有方向延伸的光。下面给出点光源在Scene视图中的表示以及Light组件的面板

球体的半径可以由面板中的Range属性来调整，也可以在Scene视图中直接拖拉点光源的线框上的控制点来修改。点光源是有位置属性的，它是由点光源的Transform组件中的Position属性定义的，对于方向属性，我们需要用点光源的位置减去某点的位置来得到它到该点的方向。而点光源的颜色和强度可以在Light面板上调整。同时点光源也是会衰减的，随着物体逐渐远离点光源，它接收到的光照强度也会逐渐减小，点光源球心处光照强度最强，球体外边界处的最弱，为0。其中的衰减值可以由一个函数定义。

<!-- 这是一张图片，ocr 内容为： -->
![点光源](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780286862943-1668ba4e-3d19-48ee-ad7c-138a510ae810.png)<!-- 这是一张图片，ocr 内容为： -->
![点光源](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780286140793-9f7ce41c-ba43-4327-8ac9-0b4d20fc6110.png)

## 聚光灯
聚光灯是三种光源类型中最复杂的一种。它的照亮空间同样是有限的，但不再是简单的球体，而是由空间中的一块锥体区域定义的。聚光灯可以用于表示由一个特定位置触发、向特定方向延伸的光。下图给出聚光灯在Scene视图中的表示以及Light组件的面板。

这块锥形区域的半径由面板中的Range属性决定，而锥体的张开角度由Spot Angle属性决定。我们同样也可以在Scene视图中直接拖拉聚光灯的线框上的控制点来修改。聚光灯的位置属性同样由Transform组件中的Position属性定义的。对于方向属性，我们需要用聚光灯的位置减去某点的位置来得到它到该点的方向。聚光灯的衰减也是随着物体逐渐远离而减小，在锥形的顶点处光照强度最强，在锥形的边界处强度为。其中的衰减值可以由一个函数定义，这个函数相对于点光源衰减计算公式更加复杂，因为我们需要判断一个点是否在锥体的范围内。

<!-- 这是一张图片，ocr 内容为： -->
![聚光灯](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780286836075-2721838d-6be7-46f7-9d56-772c114a174c.png)<!-- 这是一张图片，ocr 内容为： -->
![聚光灯](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780286889349-f705f49b-7f7c-46f1-8150-a7b8cafa7faa.png)

# 在前向渲染中处理不同的光源类型
在了解了3种光源的几何定义后，我们来看一下如何在Unity Shader种访问它们的5个属性：位置、方向、颜色、强度以及衰减。

我们的代码使用了Blinn-Phong光照模型，单独计算主光源后，通过for循环来叠加附加光。

我们在片元着色器中处理主光源的方式与之前学的基本一致：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    Light mainLight = GetMainLight();
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);
    float3 positionWS = IN.positionWS;
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

    half3 albedo = _Diffuse.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;

    half lambert = dot(lightDirWS, normalWS);
    half halfLambert = lambert * 0.5 + 0.5;
    half3 diffuse = mainLight.color * albedo * halfLambert;

    half3 halfDifWS = normalize(lightDirWS + viewDirWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness);

    float mainLightAttenuation = mainLight.distanceAttenuation;

    half3 finalColor = ambient + (diffuse + specular) * mainLightAttenuation;
    return half4(finalColor, 1);
}
```

需要注意的是，这里我们引入了一个新的元素，衰减系数（Attenuation），我们可以通过`Light.distanceAttenuation`直接获取到，平行光是没有衰减的，这里直接令衰减为1也是可以的，我们对计算而来的漫反射和高光反射的颜色乘上衰减系数来得到衰减后的颜色。通过`Light.direction`获取光的方向，通过`Light.color`获取光的颜色和强度。

对于处理附加光，我们可以通过`GetAdditionalLightsCount()`来获取影响该点的附加光数量，再通过for循环遍历每一个附加光处理光照即可，处理方式与主光源一样。

:::info
需要注意的是，`GetAdditionalLightsCount()`只在**Forward** 渲染路径下才能生效，如果是在**Forward+** 渲染路径下则返回 0，需要另一套逻辑方法，使用`USE_CLUSTER_LIGHT_LOOP`关键字来区分

:::

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    Light mainLight = GetMainLight();
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);
    float3 positionWS = IN.positionWS;
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

    half3 albedo = _Diffuse.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;

    half lambert = dot(lightDirWS, normalWS);
    half halfLambert = lambert * 0.5 + 0.5;
    half3 diffuse = mainLight.color * albedo * halfLambert;

    half3 halfDifWS = normalize(lightDirWS + viewDirWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness);

    float mainLightAttenuation = mainLight.distanceAttenuation;

    half3 finalColor = ambient + (diffuse + specular) * mainLightAttenuation;

    int addLightCount = GetAdditionalLightsCount();
    for (int i = 0; i < addLightCount; i++)
    {
        Light addLight = GetAdditionalLight(i, positionWS);
        float addLightAttenuation = addLight.distanceAttenuation;
        half3 addLightDirWS = addLight.direction;
        half addLightLambert = dot(addLightDirWS, normalWS);
        half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
        half3 addLightDiffuse = addLight.color * albedo * addLightHalfLambert;

        half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
        half3 addLightSpecular = addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness);

        half3 addColor = (addLightDiffuse + addLightSpecular) * addLightAttenuation;

        finalColor += addColor;
    }
    return half4(finalColor, 1);
}
```

使用`GetAdditionalLight(index, positionWS)`来获取第index个附加光，这里我们用不到光源的位置来对不同类型的光处理光的方向，因为在获取光源的时候，自动帮我们处理好了。在原书中，在处理非平行光的时候，是把坐标转换到了光源空间下，使用光源空间下的坐标作为UV，采样了一张光源衰减系数纹理来获取纹理。在URP中，并不需要。

这里我们可以对代码做一些优化：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    Light mainLight = GetMainLight();
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);
    float3 positionWS = IN.positionWS;
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

    half3 albedo = _Diffuse.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;

    float mainLightAttenuation = mainLight.distanceAttenuation;

    half lambert = dot(lightDirWS, normalWS);
    half halfLambert = lambert * 0.5 + 0.5;
    half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;

    half3 halfDifWS = normalize(lightDirWS + viewDirWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;

    int addLightCount = GetAdditionalLightsCount();
    for (int i = 0; i < addLightCount; i++)
    {
        Light addLight = GetAdditionalLight(i, positionWS);
        float addLightAttenuation = addLight.distanceAttenuation;
        half3 addLightDirWS = addLight.direction;
        half addLightLambert = dot(addLightDirWS, normalWS);
        half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
        diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;
        half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
        specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
    }
    half3 finalColor = ambient + albedo * diffuse + specular;
    return half4(finalColor, 1);
}
```

这里我们对漫反射和高光的计算做了优化，在计算附加光的时候直接累加在原来的diffuse和specular中，最后再统一计算。

完整代码：

```shaderlab
Shader "Unlit/ForwardRendering"
{
    Properties
    {
        _Diffuse ("Diffuse", Color) = (1, 1, 1, 1)
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType"="Opaque"
        }
        HLSLINCLUDE
        
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        
        CBUFFER_START(UnityPerMaterial)
        
        half4 _Diffuse;
        half4 _Specular;
        float _Smoothness;
        
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

            struct  Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
            };
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                return OUT;
            }
            
            half4 frag(Varyings IN) : SV_TARGET
            {
                Light mainLight = GetMainLight();
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                float3 positionWS = IN.positionWS;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);
                
                half3 albedo = _Diffuse.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                
                float mainLightAttenuation = mainLight.distanceAttenuation;
                
                half lambert = dot(lightDirWS, normalWS);
                half halfLambert = lambert * 0.5 + 0.5;
                half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;
                
                half3 halfDifWS = normalize(lightDirWS + viewDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;
                
                int addLightCount = GetAdditionalLightsCount();
                for (int i = 0; i < addLightCount; i++)
                {
                    Light addLight = GetAdditionalLight(i, positionWS);
                    float addLightAttenuation = addLight.distanceAttenuation;
                    half3 addLightDirWS = addLight.direction;
                    half addLightLambert = dot(addLightDirWS, normalWS);
                    half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
                    diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;
                    half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
                    specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
                }
                half3 finalColor = ambient + albedo * diffuse + specular;
                return half4(finalColor, 1);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

可以注意到，一个优化的地方，我们将#include和会用的材质常量全部放在了HLSLINCLUDE公共代码区中，这样我们就不用在每个Pass中都写了。

<!-- 这是一张图片，ocr 内容为： -->
![使用了绿色点光源与红色聚光灯的混合效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780385697661-5ae721cc-6c7e-4648-99f2-06af2f488572.png)

# Unity的阴影
为了让场景看起来更加真实，具有深度信息，我们通常希望光源可以把一些物体的阴影投射在其他物体上。在本节，我们就来学习如何在Unity中让一个物体向其他物体投射阴影，已经如何让一个物体接收来自其他物体的阴影。

:::info
推荐文章：[https://alex-rachel.github.io/2026/04/01/09-shadow-techniques/](https://alex-rachel.github.io/2026/04/01/09-shadow-techniques/)

:::

## 阴影的实现原理
我们可以先考虑真实生活中的阴影是如何产生的。当一个光源发射的一条光线遇到一个不透明物体时，这条光线就不可以再继续照亮其他物体（这里不考虑光线反射）。因此，这个物体就会像旁边的物体投射阴影，那些阴影区域的产生是因为光线无法到达这些区域。

这实时渲染中，我们最常使用的是一种名为Shadow Map的技术。这种技术理解起来非常简单，它会首先把摄像机的位置放在与光源重合的位置，那么场景中该光源的阴影区域就是那些摄像机看不到的地方。Unity就是使用的这种技术。

在前向渲染路径中，如果场景中最重要的主光源开启了阴影，引擎就会为该光源计算阴影纹理（shadowmap）。这张纹理本质上也是一张深度图，它记录了从该光源的位置出发、能看到的场景中距离它最近的表面位置（深度信息）。

那么在计算阴影纹理时，我们如果判定距离它最近的表面距离呢？一种方法是，先把摄像机放置在光源的位置上，然后按正常的渲染流程，即调用UniversalForward Pass来更新深度信息，得到阴影映射纹理。但这种方法会对性能造成一定的浪费，因为我们实际上仅仅需要深度信息而已，而UniversalForward Pass中往往涉及很多复杂的光照模型计算。因此Unity选择使用一个额外的Pass来专门更新光源的阴影纹理，这个Pass就是名为ShadowCaster的Pass。

:::info
推荐视频：[https://www.bilibili.com/video/BV1Kt421H7Cg/](https://www.bilibili.com/video/BV1Kt421H7Cg/?spm_id_from=333.1391.0.0)

:::

## 让物体产生阴影
我们这里直接以上一节的代码为基础实现阴影

加入一个ShadowCaster Pass：

```shaderlab
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

    #pragma vertex ShadowPassVertex
    #pragma fragment ShadowPassFragment

    #include "Packages/com.unity.render-pipelines.universal/Shaders/ShadowCasterPass.hlsl"
    ENDHLSL
}
```

首先指明该Pass的光照模式为ShadowCaster，专门用来处理阴影投射。这个Pass会在UniversalForward Pass之前执行，用于从光源视角去根据深度信息生成一张阴影贴图（Shadow Map）。因为需要深度信息，所以我们需要开启它的深度写入，深度测试模式设置为LEqual，意思为小于等于深度缓冲值的通过，也就是会写入深度缓冲，这是标准的不透明物体的深度测试状态。然后设置ColorMask 0不写入颜色缓冲。这里我们对Cull剔除模式设置了一个可变的值，可供我们调节，在不同情况下使用不同的剔除模式：

```shaderlab
Properties
{
    _Diffuse ("Diffuse", Color) = (1, 1, 1, 1)
    _Specular ("Specular", Color) = (1, 1, 1, 1)
    _Smoothness ("Smoothness", Range(8.0, 256)) = 20

    // Cull Mode枚举
    [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0
}
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781146194619-eebdcf61-32b8-4e09-b1f6-a994faca1b09.png)

不过在渲染不透明物体的阴影的时候，通常选择Off也就是_Cull为0的值。

:::info
需要注意的是，这里_Cull无需在下文生命`float _Cull;`因为这不会在顶点/片元着色器中使用。

:::

`#pragma multi_compile_instancing`用于生成实例化变体，可以将<font style="color:rgb(15, 17, 21);">使得同一个网格的多个实例可以在一次GPU绘制调用中批量渲染，从而大幅降低CPU绘制开销，提升渲染性能</font>

然后我们使用了`#pragma multi_compile_vertex _CASTING_PUNCTUAL_LIGHT_SHADOW`的编译指令，永远判断当前的光源类型，如果当前光源类型为点光源或者聚光灯，`_CASTING_PUNCTUAL_LIGHT_SHADOW`这个值会被设置为true。

```shaderlab
#pragma vertex ShadowPassVertex
#pragma fragment ShadowPassFragment

#include "Packages/com.unity.render-pipelines.universal/Shaders/ShadowCasterPass.hlsl"
```

这一部分是直接使用了URP内置的专门用于实现阴影的Pass，我们来看一下是怎么实现的：

```shaderlab
#ifndef UNIVERSAL_SHADOW_CASTER_PASS_INCLUDED
#define UNIVERSAL_SHADOW_CASTER_PASS_INCLUDED

#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"
#if defined(LOD_FADE_CROSSFADE)
    #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/LODCrossFade.hlsl"
#endif

// Shadow Casting Light geometric parameters. These variables are used when applying the shadow Normal Bias and are set by UnityEngine.Rendering.Universal.ShadowUtils.SetupShadowCasterConstantBuffer in com.unity.render-pipelines.universal/Runtime/ShadowUtils.cs
// For Directional lights, _LightDirection is used when applying shadow Normal Bias.
// For Spot lights and Point lights, _LightPosition is used to compute the actual light direction because it is different at each shadow caster geometry vertex.
float3 _LightDirection;   // 内置光源方向
float3 _LightPosition;		// 内置光源位置

struct Attributes
{
    float4 positionOS   : POSITION;
    float3 normalOS     : NORMAL;
    float2 texcoord     : TEXCOORD0;
    UNITY_VERTEX_INPUT_INSTANCE_ID
};

struct Varyings
{
    #if defined(_ALPHATEST_ON)
        float2 uv       : TEXCOORD0;
    #endif
    float4 positionCS   : SV_POSITION;
    UNITY_VERTEX_INPUT_INSTANCE_ID
};

float4 GetShadowPositionHClip(Attributes input)
{
    float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
    float3 normalWS = TransformObjectToWorldNormal(input.normalOS);

#if _CASTING_PUNCTUAL_LIGHT_SHADOW
    float3 lightDirectionWS = normalize(_LightPosition - positionWS);
#else
    float3 lightDirectionWS = _LightDirection;
#endif

    float4 positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, lightDirectionWS));

#if UNITY_REVERSED_Z
    positionCS.z = min(positionCS.z, UNITY_NEAR_CLIP_VALUE);
#else
    positionCS.z = max(positionCS.z, UNITY_NEAR_CLIP_VALUE);
#endif

    return positionCS;
}

Varyings ShadowPassVertex(Attributes input)
{
    Varyings output;
    UNITY_SETUP_INSTANCE_ID(input);
    UNITY_TRANSFER_INSTANCE_ID(input, output);

    #if defined(_ALPHATEST_ON)
        output.uv = TRANSFORM_TEX(input.texcoord, _BaseMap);
    #endif

    output.positionCS = GetShadowPositionHClip(input);
    return output;
}

half4 ShadowPassFragment(Varyings input) : SV_TARGET
{
    UNITY_SETUP_INSTANCE_ID(input);

    #if defined(_ALPHATEST_ON)
        Alpha(SampleAlbedoAlpha(input.uv, TEXTURE2D_ARGS(_BaseMap, sampler_BaseMap)).a, _BaseColor, _Cutoff);
    #endif

    #if defined(LOD_FADE_CROSSFADE)
        LODFadeCrossFade(input.positionCS);
    #endif

    return 0;
}

#endif
```

其实代码很简单。首先声明了两个变量`_LightDirection`和`_LightPosition`供之后使用，在ShadowCaster中无法使用UniversalForward中的`GetMainLight()`之类的方法来获取光源信息，只能使用这种，Unity会自动把信息填入到这两个变量中。

两个结构体很熟悉了，不过我们可以注意到两个结构体里面都有一句：`UNITY_VERTEX_INPUT_INSTANCE_ID`，这个我们配合顶点/片元着色器说，我们可以看到顶点/片元着色器中有几句：

```shaderlab
// 顶点
UNITY_SETUP_INSTANCE_ID(input);
UNITY_TRANSFER_INSTANCE_ID(input, output);

// 片元
UNITY_SETUP_INSTANCE_ID(input);
```

这几句其实就做了一件事，激活和传递实例化ID，`UNITY_VERTEX_INPUT_INSTANCE_ID`用于声明实例化ID，`UNITY_SETUP_INSTANCE_ID`用于激活实例化ID，`UNITY_TRANSFER_INSTANCE_ID`用于传递实例化ID。我们之前不是开启了实例化，而这里就是为实例化优化做的准备。

`_ALPHATEST_ON`是自定义的预编译变体指令，使用`#pragma shader_feature`来进行声明，可以在代码中使用`#if`、`#else`、`#endif`等来做判断，这里是用作是否开启透明度测试。

我们可以看到，顶点着色器中就使用了一句话`output.positionCS = GetShadowPositionHClip(input);`，

这个`GetShadowPositionHClip`就是阴影Pass实现的核心：

```shaderlab
float4 GetShadowPositionHClip(Attributes input)
{
    float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
    float3 normalWS = TransformObjectToWorldNormal(input.normalOS);

#if _CASTING_PUNCTUAL_LIGHT_SHADOW
    float3 lightDirectionWS = normalize(_LightPosition - positionWS);
#else
    float3 lightDirectionWS = _LightDirection;
#endif

    float4 positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, lightDirectionWS));

#if UNITY_REVERSED_Z
    positionCS.z = min(positionCS.z, UNITY_NEAR_CLIP_VALUE);
#else
    positionCS.z = max(positionCS.z, UNITY_NEAR_CLIP_VALUE);
#endif

    return positionCS;
}
```

首先对顶点坐标和法线变换到了世界空间进行使用，然后根据光源类型来计算光源方向。接下来是重点，使用ApplyShadowBias方法返回的值变换顶点坐标，这里意思就是主动修改了顶点的坐标，偏移了下深度值，防止阴影痤疮。具体阴影痤疮是什么推荐看下面视频。

:::info
推荐视频：[https://www.bilibili.com/video/BV1Kt421H7Cg/](https://www.bilibili.com/video/BV1Kt421H7Cg/?spm_id_from=333.1391.0.0)

:::

偏移值就是我们在URP资产中设置的。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781148667334-60c3004c-86d2-4483-8eae-f594f3c70f63.png)

后面的`UNITY_REVERSED_Z`是适配不同设置而做的修改，不做赘述。

最后返回修改后的齐次裁剪空间下的顶点坐标，我们的任务就完成了。我们只需要返回正确的顶点坐标，片元着色器中什么都不需要做，返回0即可。

片元着色器中还有一段：

```shaderlab
#if defined(LOD_FADE_CROSSFADE)
      LODFadeCrossFade(input.positionCS);
  #endif
```

根据是否开启了LOD衰减，来淡变衰减。LOD类似于之前说过的Mipmap，在距离远的时候使用质量低的贴图，而这个LOD衰减淡变就是在LOD级别的切换的临界处用两个级别的贴图做一个过渡。在UPR资产中开启：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781148019710-cc63e1d5-ede5-4209-b46b-d21959cb2d0a.png)

也可以声明变体来获得开启和不开启的两种变体：

```shaderlab
#pragma multi_compile _ LOD_FADE_CROSSFADE
```

完整代码：

```shaderlab
Shader "Unlit/Shadow"
{
    Properties
    {
        _Diffuse ("Diffuse", Color) = (1, 1, 1, 1)
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType"="Opaque"
        }
        HLSLINCLUDE
        
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        
        CBUFFER_START(UnityPerMaterial)
        
        half4 _Diffuse;
        half4 _Specular;
        float _Smoothness;
        
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

            struct  Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
            };
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;
                return OUT;
            }
            
            half4 frag(Varyings IN) : SV_TARGET
            {
                Light mainLight = GetMainLight();
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                float3 positionWS = IN.positionWS;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);
                
                half3 albedo = _Diffuse.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                
                float mainLightAttenuation = mainLight.distanceAttenuation;
                
                half lambert = dot(lightDirWS, normalWS);
                half halfLambert = lambert * 0.5 + 0.5;
                half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;
                
                half3 halfDifWS = normalize(lightDirWS + viewDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;
                
                int addLightCount = GetAdditionalLightsCount();
                for (int i = 0; i < addLightCount; i++)
                {
                    Light addLight = GetAdditionalLight(i, positionWS);
                    float addLightAttenuation = addLight.distanceAttenuation;
                    half3 addLightDirWS = addLight.direction;
                    half addLightLambert = dot(addLightDirWS, normalWS);
                    half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
                    diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;
                    
                    half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
                    specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
                }
                half3 finalColor = ambient + albedo * diffuse + specular;
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
            
            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment
            
            #include "Packages/com.unity.render-pipelines.universal/Shaders/ShadowCasterPass.hlsl"
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

这样我们的阴影就生成了

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781149417909-4e3ec9a7-a9a6-473f-a5b9-2f864f8d520c.png)

我们还可以做一个尝试，不使用内置的阴影Pass，我们的阴影Pass中写代码，只需要抄过来就可以了：

```shaderlab
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
```

当然你也可以像内置的阴影Pass一样写成单独的函数。

:::info
建议使用手动写阴影的投射，便于更改调试扩展。

:::

## 如何接收阴影
做阴影的接收很简单，我们首先在HLSL体中先加入接收阴影的编译指令：

```shaderlab
#pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
```

`_MAIN_LIGHT_SHADOWS`是主光源阴影，`_MAIN_LIGHT_SHADOWS_CASCADE`是主光源阴影级联，`_MAIN_LIGHT_SHADOWS_SCREEN`是主光源屏幕空间阴影

然后只需要在原来的基础上加上阴影坐标就可以

首先在输出结构体中加入阴影坐标，需要从顶点着色器中计算传入片元着色器中。

```shaderlab
struct Varyings
{
    float4 positionHCS : SV_POSITION;
    float3 normalWS : TEXCOORD0;
    float3 positionWS : TEXCOORD1;
    float4 shadowCoord : TEXCOORD2;
};
```

计算阴影坐标：

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionHCS = positionInputs.positionCS;
    OUT.positionWS = positionInputs.positionWS;
    VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
    OUT.normalWS = normalInputs.normalWS;

    OUT.shadowCoord = GetShadowCoord(positionInputs);
    return OUT;
}
```

只有一句话，使用`GetShadowCoord`方法，传入`VertexPositionInputs`结构体就可以获取。

然后在片元着色器中使用阴影坐标：

```shaderlab
half4 frag(Varyings IN) : SV_TARGET
{
    Light mainLight = GetMainLight(IN.shadowCoord);
    half3 lightDirWS = mainLight.direction;
    half3 normalWS = normalize(IN.normalWS);
    float3 positionWS = IN.positionWS;
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

    half3 albedo = _Diffuse.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;

    float mainLightAttenuation = mainLight.distanceAttenuation;

    half lambert = dot(lightDirWS, normalWS);
    half halfLambert = lambert * 0.5 + 0.5;
    half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;

    half3 halfDifWS = normalize(lightDirWS + viewDirWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;

    int addLightCount = GetAdditionalLightsCount();
    for (int i = 0; i < addLightCount; i++)
    {
        Light addLight = GetAdditionalLight(i, positionWS);
        float addLightAttenuation = addLight.distanceAttenuation;
        half3 addLightDirWS = addLight.direction;
        half addLightLambert = dot(addLightDirWS, normalWS);
        half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
        diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;

        half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
        specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
    }

    half shadowAttenuation = mainLight.shadowAttenuation;
    half3 finalColor = ambient + (albedo * diffuse + specular) * shadowAttenuation;
    return half4(finalColor, 1);
}
```

在`GetMainLight`中传入阴影坐标，此时内部会自动计算阴影衰减，Light里面的`shadowAttenuation`就是计算得到的阴影衰减系数，我们只需要在最后对漫反射和高光乘上阴影衰减系数就可以了。

<!-- 这是一张图片，ocr 内容为： -->
![背面阴影](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781157838209-f7d069d0-fc74-4f87-8612-8d40d4c60887.png)<!-- 这是一张图片，ocr 内容为： -->
![受阻挡阴影](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781157855357-5328adc9-e921-4931-8c78-f57fbfda9b4b.png)

如果不想让阴影面这么黑的话（其实如果加上材质贴图就不会这么黑了），我们可以添加一个变量来调节接收的阴影的强度：

```shaderlab
Properties
{
    _Diffuse ("Diffuse", Color) = (1, 1, 1, 1)
    _Specular ("Specular", Color) = (1, 1, 1, 1)
    _Smoothness ("Smoothness", Range(8.0, 256)) = 20
    _ShadowsStrength ("Shadows Strength", Range(0, 1)) = 0.9

    [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0
}


shadowAttenuation = lerp(1, shadowAttenuation, _ShadowsStrength);
```

使用lerp来调节阴影强度。

完整代码：

```shaderlab
Shader "Unlit/Shadow"
{
    Properties
    {
        _Diffuse ("Diffuse", Color) = (1, 1, 1, 1)
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        _ShadowsStrength ("Shadows Strength", Range(0, 1)) = 0.9

        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType"="Opaque"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

        CBUFFER_START(UnityPerMaterial)
            half4 _Diffuse;
            half4 _Specular;
            float _Smoothness;
            half _ShadowsStrength;

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

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float4 shadowCoord : TEXCOORD2;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;

                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                float3 positionWS = IN.positionWS;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

                half3 albedo = _Diffuse.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;

                float mainLightAttenuation = mainLight.distanceAttenuation;

                half lambert = dot(lightDirWS, normalWS);
                half halfLambert = lambert * 0.5 + 0.5;
                half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;

                half3 halfDifWS = normalize(lightDirWS + viewDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;

                int addLightCount = GetAdditionalLightsCount();
                for (int i = 0; i < addLightCount; i++)
                {
                    Light addLight = GetAdditionalLight(i, positionWS);
                    float addLightAttenuation = addLight.distanceAttenuation;
                    half3 addLightDirWS = addLight.direction;
                    half addLightLambert = dot(addLightDirWS, normalWS);
                    half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
                    diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;

                    half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
                    specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
                }

                half shadowAttenuation = mainLight.shadowAttenuation;
                shadowAttenuation = lerp(1, shadowAttenuation, _ShadowsStrength);
                half3 finalColor = ambient + (albedo * diffuse + specular) * shadowAttenuation;
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
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781158292890-cee8c770-0932-479e-b16a-8cd01bb2114c.png)<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781158306593-babf95b5-3ccc-4b7f-8e1c-2b638ac59f6a.png)

如果加上材质：

```shaderlab
Shader "Unlit/Shadow"
{
    Properties
    {
        _BaseMap ("Base Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        _ShadowsStrength ("Shadows Strength", Range(0, 1)) = 0.9
        _Cutoff ("Cutoff", Range(0, 1)) = 0


        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType"="Opaque"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _Specular;
            float _Smoothness;
            half _ShadowsStrength;
            half _Cutoff;

        CBUFFER_END
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            Cull Off

            HLSLPROGRAM
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float4 shadowCoord : TEXCOORD2;
                float2 uv0 : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;

                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                float3 positionWS = IN.positionWS;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);

                clip(baseMap.a - _Cutoff);
                half3 albedo = baseMap.rgb;

                half3 ambient = SampleSH(normalWS) * albedo;

                float mainLightAttenuation = mainLight.distanceAttenuation;

                half lambert = dot(lightDirWS, normalWS);
                half halfLambert = lambert * 0.5 + 0.5;
                half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;

                half3 halfDifWS = normalize(lightDirWS + viewDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;

                int addLightCount = GetAdditionalLightsCount();
                for (int i = 0; i < addLightCount; i++)
                {
                    Light addLight = GetAdditionalLight(i, positionWS);
                    float addLightAttenuation = addLight.distanceAttenuation;
                    half3 addLightDirWS = addLight.direction;
                    half addLightLambert = dot(addLightDirWS, normalWS);
                    half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
                    diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;

                    half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
                    specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
                }

                half shadowAttenuation = mainLight.shadowAttenuation;
                shadowAttenuation = lerp(1, shadowAttenuation, _ShadowsStrength);
                half3 finalColor = ambient + (albedo * diffuse + specular) * shadowAttenuation;
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
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

这里我们仍然使用transparent_texture.psd纹理：	

<!-- 这是一张图片，ocr 内容为： -->
![阴影强度：1](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781158669208-b8b08b33-b905-48e3-b426-46d3ed232e2c.png)<!-- 这是一张图片，ocr 内容为： -->
![阴影强度：0.9](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781158692015-299f9ee5-9fdc-4c29-8b10-985a58df0401.png)

## 透明度物体的阴影
### 透明度测试
如果我们仅仅只是把透明度测试加在UniversalForward Pass中，那么会出现下图中的情况：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781162402897-47bf981f-e2e1-45ef-9378-9bd550b9613f.png)

我们可以发现，虽然能产生阴影，但镂空区域出现了不正常的阴影，看起来就像这个正方体是一个普通的正方体一样。而这不是我们想要得到的，我们希望有些光应该是可以通过这些镂空区域透过来的，这些区域不应该有阴影。

为了让使用透明度测试的物体得到正确的阴影效果，我们只需要在阴影Pass的片元着色器中加入两行代码：

```shaderlab
half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
clip(baseMap.a - _Cutoff);
```

这跟我们在UniversalForward Pass中实现透明度测试的代码一模一样，需要注意的是，我们还需要得到UV来采样基础纹理。

完整代码：

```shaderlab
Shader "Unlit/Shadow"
{
    Properties
    {
        _BaseMap ("Base Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        _ShadowsStrength ("Shadows Strength", Range(0, 1)) = 0.9
        _Cutoff ("Cutoff", Range(0, 1)) = 0


        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "TransparentCutout"
            "Queue" = "AlphaTest"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _Specular;
            float _Smoothness;
            half _ShadowsStrength;
            half _Cutoff;

        CBUFFER_END
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            Cull Off

            HLSLPROGRAM
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float4 shadowCoord : TEXCOORD2;
                float2 uv0 : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;

                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                float3 positionWS = IN.positionWS;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);

                clip(baseMap.a - _Cutoff);
                half3 albedo = baseMap.rgb;

                half3 ambient = SampleSH(normalWS) * albedo;

                float mainLightAttenuation = mainLight.distanceAttenuation;

                half lambert = dot(lightDirWS, normalWS);
                half halfLambert = lambert * 0.5 + 0.5;
                half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;

                half3 halfDifWS = normalize(lightDirWS + viewDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;

                int addLightCount = GetAdditionalLightsCount();
                for (int i = 0; i < addLightCount; i++)
                {
                    Light addLight = GetAdditionalLight(i, positionWS);
                    float addLightAttenuation = addLight.distanceAttenuation;
                    half3 addLightDirWS = addLight.direction;
                    half addLightLambert = dot(addLightDirWS, normalWS);
                    half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
                    diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;

                    half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
                    specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
                }

                half shadowAttenuation = mainLight.shadowAttenuation;
                shadowAttenuation = lerp(1, shadowAttenuation, _ShadowsStrength);
                half3 finalColor = ambient + (albedo * diffuse + specular) * shadowAttenuation;
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
                float4 uv0 : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv0 : TEXCOORD0;
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
                
                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                return OUT;
            }

            half4 ShadowFrag(Varyings IN) : SV_TARGET
            {
                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
                clip(baseMap.a - _Cutoff);
                return 0;
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

<!-- 这是一张图片，ocr 内容为： -->
![出现镂空的阴影](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781162730995-6c11e1f8-cd0d-4bb0-8977-1d6a90c046aa.png)

### 透明度混合
透明度混合，自需要在原来的基础上加入透明度混合的代码即可

完整代码：

```shaderlab
Shader "Unlit/Shadow"
{
    Properties
    {
        _BaseMap ("Base Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        _ShadowsStrength ("Shadows Strength", Range(0, 1)) = 0.9
        _AlphaScale ("Alpha Scale", Range(0, 1)) = 1


        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull Mode", Float) = 0
    }
    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
        }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);
        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _Specular;
            float _Smoothness;
            half _ShadowsStrength;
            half _AlphaScale;

        CBUFFER_END
        ENDHLSL

        Pass
        {
            Tags
            {
                "LightMode" = "UniversalForward"
            }
            ZWrite Off
            Blend SrcAlpha OneMinusSrcAlpha

            HLSLPROGRAM
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN

            #pragma vertex vert
            #pragma fragment frag

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float4 shadowCoord : TEXCOORD2;
                float2 uv0 : TEXCOORD3;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS);
                OUT.normalWS = normalInputs.normalWS;

                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                OUT.shadowCoord = GetShadowCoord(positionInputs);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_TARGET
            {
                Light mainLight = GetMainLight(IN.shadowCoord);
                half3 lightDirWS = mainLight.direction;
                half3 normalWS = normalize(IN.normalWS);
                float3 positionWS = IN.positionWS;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);

                half4 baseMap = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0);
                
                half3 albedo = baseMap.rgb;

                half3 ambient = SampleSH(normalWS) * albedo;

                float mainLightAttenuation = mainLight.distanceAttenuation;

                half lambert = dot(lightDirWS, normalWS);
                half halfLambert = lambert * 0.5 + 0.5;
                half3 diffuse = mainLight.color * halfLambert * mainLightAttenuation;

                half3 halfDifWS = normalize(lightDirWS + viewDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(halfDifWS, normalWS)), _Smoothness) * mainLightAttenuation;

                int addLightCount = GetAdditionalLightsCount();
                for (int i = 0; i < addLightCount; i++)
                {
                    Light addLight = GetAdditionalLight(i, positionWS);
                    float addLightAttenuation = addLight.distanceAttenuation;
                    half3 addLightDirWS = addLight.direction;
                    half addLightLambert = dot(addLightDirWS, normalWS);
                    half addLightHalfLambert = addLightLambert * 0.5 + 0.5;
                    diffuse += addLight.color * addLightHalfLambert * addLightAttenuation;

                    half3 addLightHalfDirwS = normalize(addLightDirWS + viewDirWS);
                    specular += addLight.color * _Specular.rgb * pow(max(0, dot(addLightHalfDirwS, normalWS)), _Smoothness) * addLightAttenuation;
                }

                half shadowAttenuation = mainLight.shadowAttenuation;
                shadowAttenuation = lerp(1, shadowAttenuation, _ShadowsStrength);
                half3 finalColor = ambient + (albedo * diffuse + specular) * shadowAttenuation;
                return half4(finalColor, baseMap.a * _AlphaScale);
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
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

<!-- 这是一张图片，ocr 内容为： -->
![透明度混合](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781163186955-4aa67d4f-af1a-43e3-ba3d-d1c39d91da48.png)

## 阴影的质量
在URP中，我们可以对阴影的质量进行配置，对阴影的配置决定了项目的性能开销与视觉效果，我们需要对这两方面进行一个平衡。

:::info
只有逐像素光源才支持阴影，主光源与附加光中只会对应用一个平行光的阴影，点光源和聚光灯没有限制

:::

在URP资产中的Lighing → Shadow Resolution中可以调节阴影贴图的分辨率，分辨率越高阴影的质量就越高，要求的算力也就越高。但不是所有适合分辨率越高越好的，有时候我们需要开启软阴影，分辨率高了，软阴影的效果就会越差。

<!-- 这是一张图片，ocr 内容为： -->
![阴影贴图分辨率设置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780541061605-60aaa50f-a9df-4619-be5d-e6a3bb28a0b2.png)

在URP资产中的Shadow → Soft Shadows可以勾选是否开启软阴影，以及配置软阴影的质量。如果你项目里配置了多台光源都可以产生阴影，不希望都使用软阴影的话，可以对光源进行单独配置。

<!-- 这是一张图片，ocr 内容为： -->
![开启软阴影](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780541213397-7bdef4bf-d28f-49cd-90fb-90751ec7b8f3.png)

在光源的Shadows配置中可以选择阴影类型，这里的选择会覆盖掉全局的设置。

<!-- 这是一张图片，ocr 内容为： -->
![光源的阴影设置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780541336873-41663e59-fe89-4243-8ea1-746d79ba7c12.png)

设置MaxDistance可以修改可以看到阴影的最大距离，但这个值也不是越大越好，当距离远大于可见阴影距离的时候，阴影会变得非常模糊，因为阴影贴图被分散到了过大的地方，这些地方公用一张阴影贴图，导致近处精度严重不足。

<!-- 这是一张图片，ocr 内容为： -->
![MaxDistance：50](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780542029587-505827e2-3c2e-4716-a7ef-ac37b09086d3.png)<!-- 这是一张图片，ocr 内容为： -->
![MaxDistance：500](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780542038949-6942fa89-6e35-4021-bd00-7c18a81cf386.png)

因此我们能看到多远距离的阴影，就设置多远，或者我们使用级联阴影贴图。

再往下一栏就是级联阴影设置。Cascade Count就是级联阴影的级联数量，级联数越高，近景阴影质量越高。级联阴影就是把阴影贴图不均匀的分配给每个级联，分成几部分阴影贴图，每个级联的阴影贴图的精度不一，级联越靠前的精度更高。在下面可以拖动那四个颜色的条，来更改每一级联的距离，在不同距离使用不同级联的阴影，类似于mipmap。（移动的推荐2，PC推荐4）

<!-- 这是一张图片，ocr 内容为： -->
![级联阴影](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780543074013-b749a4e0-51df-43f2-a12b-3578e063801f.png)
